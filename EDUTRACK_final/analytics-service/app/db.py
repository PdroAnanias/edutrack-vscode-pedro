# ============================================================================
# EduTrack AI v2 - analytics-service/app/db.py
# Conexão somente leitura ao SQL Server via SQLAlchemy e pyodbc
# Suporta Windows Authentication (Trusted_Connection) e SQL Auth com fallback automático
# ============================================================================

from sqlalchemy import create_engine, text
import urllib.parse
from app.config import settings

def get_engine():
    # 1. Tentar conexão com usuário e senha
    sql_auth_params = (
        f"Driver={{{settings.db_driver}}};"
        f"Server={settings.db_server};"
        f"Database={settings.db_name};"
        f"UID={settings.db_user};"
        f"PWD={settings.db_password};"
        "TrustServerCertificate=yes;"
    )
    encoded_sql = urllib.parse.quote_plus(sql_auth_params)
    engine_sql = create_engine(
        f"mssql+pyodbc:///?odbc_connect={encoded_sql}",
        pool_size=10,
        max_overflow=5,
        pool_recycle=1800,
        pool_pre_ping=True
    )

    try:
        with engine_sql.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine_sql
    except Exception:
        # 2. Fallback transparente para Windows Authentication
        win_params = (
            f"Driver={{{settings.db_driver}}};"
            f"Server={settings.db_server};"
            f"Database={settings.db_name};"
            "Trusted_Connection=yes;"
            "TrustServerCertificate=yes;"
        )
        encoded_win = urllib.parse.quote_plus(win_params)
        return create_engine(
            f"mssql+pyodbc:///?odbc_connect={encoded_win}",
            pool_size=10,
            max_overflow=5,
            pool_recycle=1800,
            pool_pre_ping=True
        )

engine = get_engine()

def execute_query(sql_text: str, params: dict = None):
    """Executa query SQL parametrizada de leitura e retorna lista de dicionários"""
    with engine.connect() as conn:
        result = conn.execute(text(sql_text), params or {})
        columns = result.keys()
        return [dict(zip(columns, row)) for row in result.fetchall()]

def check_db_health():
    try:
        rows = execute_query("SELECT 1 as healthy, DB_NAME() as db_name, @@VERSION as version")
        return {
            "status": "up",
            "database": rows[0]["db_name"] if rows else None,
            "healthy": bool(rows and rows[0]["healthy"] == 1)
        }
    except Exception as e:
        return {
            "status": "down",
            "error": str(e)
        }
