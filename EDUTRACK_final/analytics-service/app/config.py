# ============================================================================
# EduTrack AI v2 - analytics-service/app/config.py
# Configurações do serviço lidas a partir de variáveis de ambiente (.env)
# ============================================================================

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    db_server: str = Field(default=r"localhost\SQLEXPRESS", validation_alias="DB_SERVER")
    db_name: str = Field(default="EduTrackAI", validation_alias="DB_NAME")
    db_user: str = Field(default="edutrack_py_ro", validation_alias="DB_USER")
    db_password: str = Field(default="", validation_alias="DB_PASSWORD")
    db_driver: str = Field(default="ODBC Driver 18 for SQL Server", validation_alias="DB_DRIVER")
    
    internal_key: str = Field(default="", validation_alias="INTERNAL_KEY")
    
    llm_provider: str = Field(default="gemini", validation_alias="LLM_PROVIDER")
    llm_api_key: str = Field(default="", validation_alias="LLM_API_KEY")
    llm_model: str = Field(default="gemini-2.5-flash", validation_alias="LLM_MODEL")
    llm_timeout_seconds: int = Field(default=20, validation_alias="LLM_TIMEOUT_SECONDS")
    llm_max_insights: int = Field(default=6, validation_alias="LLM_MAX_INSIGHTS")
    
    tz: str = Field(default="America/Sao_Paulo", validation_alias="TZ")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
