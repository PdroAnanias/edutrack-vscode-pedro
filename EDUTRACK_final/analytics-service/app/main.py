# ============================================================================
# EduTrack AI v2 - analytics-service/app/main.py
# Aplicação Principal FastAPI do Microsserviço de Analytics e Relatórios
# ============================================================================

import os
import threading
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.db import check_db_health, execute_query
from app.security import verify_internal_key
from app.metrics.progress import (
    calculate_task_weights,
    calculate_discipline_progress,
    calculate_overall_progress
)
from app.metrics.forecast import (
    calculate_velocity,
    calculate_forecast_per_discipline
)
from app.metrics.time_tracking import (
    calculate_time_tracking,
    calculate_study_streak
)
from app.insights.engine import build_insights_response
from app.reports.jobs import job_manager
from app.reports.generator import build_pdf_report

app = FastAPI(
    title="EduTrack AI Analytics Service",
    version="2.0.0",
    description="Microsserviço de métricas avançadas, previsões, insights e relatórios em PDF"
)

# -------------------------------------------------------------
# ROTAS PÚBLICAS E HEALTH
# -------------------------------------------------------------
@app.get("/v1/health")
def get_health():
    db_status = check_db_health()
    return {
        "status": "healthy" if db_status.get("healthy") else "degraded",
        "service": "analytics-service",
        "database": db_status,
        "llm_provider": settings.llm_provider,
        "timestamp": datetime.now().isoformat()
    }

# -------------------------------------------------------------
# FUNÇÃO CORE DE COMPILAÇÃO DE MÉTRICAS (REUTILIZADA EM METRICAS, INSIGHTS E PDF)
# -------------------------------------------------------------
def compile_user_metrics(user_id: int) -> dict:
    today = date.today()
    today_str = str(today)

    # 1. Buscar dados do usuário
    user_rows = execute_query(
        "SELECT id_usuario, nome, sobrenome, meta_semanal_horas, tema_preferido FROM Usuarios WHERE id_usuario = :uid",
        {"uid": user_id}
    )
    if not user_rows:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    user = user_rows[0]

    # 2. Buscar disciplinas
    disciplines = execute_query(
        "SELECT id_disciplina, id_usuario, nome, professor, carga_horaria, data_inicio, data_fim FROM Disciplinas WHERE id_usuario = :uid",
        {"uid": user_id}
    )

    # 3. Buscar tarefas com sessões agregadas
    tasks = execute_query(
        """
        SELECT 
            t.id_tarefa, t.id_disciplina, t.titulo, t.status, t.horas_estimadas,
            t.data_prevista, t.concluida_em, t.criado_em,
            ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.0) as horas_reais
        FROM Tarefas t
        JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
        LEFT JOIN SessoesEstudo s ON s.id_tarefa = t.id_tarefa AND s.fim IS NOT NULL
        WHERE d.id_usuario = :uid
        GROUP BY t.id_tarefa, t.id_disciplina, t.titulo, t.status, t.horas_estimadas, t.data_prevista, t.concluida_em, t.criado_em
        """,
        {"uid": user_id}
    )

    # 4. Histórico semanal
    weekly_history = execute_query(
        """
        SELECT semana_inicio, horas_estudadas as horas_reais, tarefas_concluidas
        FROM vw_HorasPorSemana
        WHERE id_usuario = :uid
        ORDER BY semana_inicio DESC
        """,
        {"uid": user_id}
    )

    # 5. Sessões para cálculo de sequência
    sessions = execute_query(
        "SELECT inicio, fim FROM SessoesEstudo WHERE id_usuario = :uid AND fim IS NOT NULL ORDER BY inicio DESC",
        {"uid": user_id}
    )

    # Executar cálculos estatísticos
    weighted_tasks = calculate_task_weights(tasks)
    disc_progress = calculate_discipline_progress(disciplines, weighted_tasks)
    overall_prog = calculate_overall_progress(disc_progress, today_str)

    vel_horas, vel_tarefas = calculate_velocity(weekly_history)
    completed_weeks_count = len(weekly_history)

    forecasts = calculate_forecast_per_discipline(
        disciplines=disc_progress,
        weighted_tasks=weighted_tasks,
        velocity_hours_per_week=vel_horas,
        today=today,
        completed_weeks_count=completed_weeks_count
    )

    time_tracking = calculate_time_tracking(disciplines, tasks)
    tt_map = {tt["id_disciplina"]: tt for tt in time_tracking}

    # Mesclar comparativo de horas em cada disciplina
    disciplinas_final = []
    for f in forecasts:
        d_id = f["id_disciplina"]
        tt = tt_map.get(d_id, {})
        disciplinas_final.append({
            "id_disciplina": d_id,
            "nome": f["nome"],
            "carga_horaria": f["carga_horaria"],
            "progresso_simples_pct": f.get("progresso_simples_pct", 0.0),
            "progresso_ponderado_pct": f.get("progresso_ponderado_pct", 0.0),
            "horas_estimadas_total": tt.get("horas_estimadas_total", 0.0),
            "horas_reais_total": tt.get("horas_reais_total", 0.0),
            "desvio_pct": tt.get("desvio_pct"),
            "fator_ajuste": f.get("fator_ajuste", 1.0),
            "trabalho_restante_h": f.get("trabalho_restante_h", 0.0),
            "data_prevista_conclusao": f.get("data_prevista_conclusao"),
            "data_fim": str(f.get("data_fim")),
            "folga_dias": f.get("folga_dias"),
            "situacao_previsao": f.get("situacao_previsao"),
            "confianca": f.get("confianca"),
            "tarefas_sem_estimativa": f.get("tarefas_sem_estimativa", 0)
        })

    # Contagens de tarefas
    pendentes_count = sum(1 for t in tasks if t.get("status") not in ("Concluida", "Concluída"))
    concluidas_count = len(tasks) - pendentes_count
    atrasadas_count = sum(
        1 for t in tasks 
        if t.get("status") not in ("Concluida", "Concluída") 
        and t.get("data_prevista") and str(t.get("data_prevista")) < today_str
    )
    vencendo_7 = sum(
        1 for t in tasks 
        if t.get("status") not in ("Concluida", "Concluída") 
        and t.get("data_prevista") 
        and today_str <= str(t.get("data_prevista")) <= str(today + timedelta(days=7))
    )

    streak = calculate_study_streak(sessions, today)

    # Horas da semana atual
    horas_semana_atual = float(weekly_history[0]["horas_reais"]) if weekly_history else 0.0
    meta_h = float(user.get("meta_semanal_horas") or 10.0)
    pct_meta = round((horas_semana_atual / meta_h) * 100.0, 1) if meta_h > 0 else 0.0

    evolucao_semanal = []
    for w in weekly_history[:8]:
        evolucao_semanal.append({
            "semana_inicio": str(w.get("semana_inicio")),
            "horas_reais": float(w.get("horas_reais", 0.0)),
            "tarefas_concluidas": int(w.get("tarefas_concluidas", 0)),
            "meta_horas": meta_h
        })

    return {
        "gerado_em": datetime.now().isoformat(),
        "aluno_nome": f"{user['nome']} {user.get('sobrenome', '')}".strip(),
        "geral": {
            "progresso_geral_ponderado_pct": overall_prog["progresso_geral_ponderado_pct"],
            "progresso_geral_simples_pct": overall_prog["progresso_geral_simples_pct"],
            "velocidade_horas_semana": vel_horas,
            "velocidade_tarefas_semana": vel_tarefas,
            "horas_semana_atual": horas_semana_atual,
            "meta_semanal_horas": meta_h,
            "percentual_meta_semanal": pct_meta,
            "sequencia_dias": streak,
            "tarefas": {
                "pendentes": pendentes_count,
                "concluidas": concluidas_count,
                "atrasadas": atrasadas_count,
                "vencendo_7_dias": vencendo_7
            }
        },
        "disciplinas": disciplinas_final,
        "evolucao_semanal": evolucao_semanal
    }

# -------------------------------------------------------------
# ROTAS ANALÍTICAS PROTEGIDAS POR X-INTERNAL-KEY
# -------------------------------------------------------------
@app.get("/v1/usuarios/{id_usuario}/metricas", dependencies=[Depends(verify_internal_key)])
def get_user_metrics(id_usuario: int):
    return compile_user_metrics(id_usuario)

@app.get("/v1/usuarios/{id_usuario}/insights", dependencies=[Depends(verify_internal_key)])
def get_user_insights(id_usuario: int, modo: str = Query("regras", regex="^(regras|ia)$")):
    metrics = compile_user_metrics(id_usuario)
    student_name = metrics.get("aluno_nome", "Estudante")
    return build_insights_response(student_name, metrics, mode=modo)

# -------------------------------------------------------------
# RELATÓRIOS EM PDF (ASSÍNCRONOS VIA JOBS)
# -------------------------------------------------------------
class ReportRequest(BaseModel):
    id_usuario: int
    semana_inicio: Optional[str] = None

def generate_report_worker(job_id: str, user_id: int, week_start: Optional[str]):
    try:
        job_manager.update_job_status(job_id, "gerando")
        metrics = compile_user_metrics(user_id)

        # Buscar atividades do período
        timeline_rows = execute_query(
            """
            SELECT criado_em, tipo, descricao, nome_disciplina 
            FROM HistoricoAtividades 
            WHERE id_usuario = :uid 
            ORDER BY criado_em DESC
            """,
            {"uid": user_id}
        )

        # Horas por dia da semana
        daily_rows = execute_query(
            """
            SELECT 
                DATENAME(WEEKDAY, inicio) as dia_semana,
                SUM(duracao_seg) / 3600.0 as horas
            FROM SessoesEstudo
            WHERE id_usuario = :uid AND fim IS NOT NULL
            GROUP BY DATENAME(WEEKDAY, inicio)
            """,
            {"uid": user_id}
        )
        days_pt = {
            "Monday": "Seg", "Tuesday": "Ter", "Wednesday": "Qua",
            "Thursday": "Qui", "Friday": "Sex", "Saturday": "Sáb", "Sunday": "Dom",
            "Segunda-feira": "Seg", "Terça-feira": "Ter", "Quarta-feira": "Qua",
            "Quinta-feira": "Qui", "Sexta-feira": "Sex", "Sábado": "Sáb", "Domingo": "Dom"
        }
        hours_per_day = { "Seg": 0.0, "Ter": 0.0, "Qua": 0.0, "Qui": 0.0, "Sex": 0.0, "Sáb": 0.0, "Dom": 0.0 }
        for r in daily_rows:
            dia = days_pt.get(r.get("dia_semana"), "Seg")
            hours_per_day[dia] = round(float(r.get("horas") or 0.0), 1)

        # Tarefas concluídas e atrasadas
        tasks = execute_query(
            """
            SELECT t.titulo, d.nome as disciplina, t.status, t.horas_estimadas, t.data_prevista, t.concluida_em,
                   ISNULL(SUM(s.duracao_seg) / 3600.0, 0.0) as horas_reais
            FROM Tarefas t
            JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
            LEFT JOIN SessoesEstudo s ON s.id_tarefa = t.id_tarefa AND s.fim IS NOT NULL
            WHERE d.id_usuario = :uid
            GROUP BY t.id_tarefa, t.titulo, d.nome, t.status, t.horas_estimadas, t.data_prevista, t.concluida_em
            """,
            {"uid": user_id}
        )

        concluidas = []
        atrasadas = []
        today_str = str(date.today())

        for t in tasks:
            est = float(t.get("horas_estimadas") or 0.0)
            real = float(t.get("horas_reais") or 0.0)
            desvio = round(((real - est) / est) * 100.0, 1) if est > 0 and real > 0 else None

            if t.get("status") in ("Concluida", "Concluída"):
                concluidas.append({
                    "titulo": t["titulo"],
                    "disciplina": t["disciplina"],
                    "concluida_em": t.get("concluida_em"),
                    "horas_estimadas": est,
                    "horas_reais": real,
                    "desvio_pct": desvio
                })
            elif t.get("data_prevista") and str(t.get("data_prevista"))[:10] < today_str:
                dt_str = str(t["data_prevista"])[:10]
                try:
                    d_prev = datetime.strptime(dt_str, "%Y-%m-%d").date()
                except Exception:
                    d_prev = date.today()
                atrasadas.append({
                    "titulo": t.get("titulo", "Tarefa"),
                    "disciplina": t.get("disciplina", "Matéria"),
                    "data_prevista": dt_str,
                    "dias_atraso": max(1, (date.today() - d_prev).days)
                })

        insights_resp = build_insights_response(metrics["aluno_nome"], metrics, mode="regras")

        report_payload = {
            "aluno_nome": metrics["aluno_nome"],
            "curso_nome": "Ciência da Computação",
            "periodo_str": week_start or "Últimos 7 dias",
            "kpi": {
                "concluidas": len(concluidas),
                "adicionadas": len(tasks),
                "atrasadas": len(atrasadas),
                "horas_estudadas": metrics["geral"]["horas_semana_atual"],
                "meta_pct": metrics["geral"]["percentual_meta_semanal"],
                "sequencia_dias": metrics["geral"]["sequencia_dias"]
            },
            "tarefas_concluidas": concluidas,
            "tarefas_atrasadas": atrasadas,
            "horas_por_dia": hours_per_day,
            "meta_diaria": round(metrics["geral"]["meta_semanal_horas"] / 7.0, 1),
            "meta_semanal": metrics["geral"]["meta_semanal_horas"],
            "progresso_disciplinas": metrics["disciplinas"],
            "evolucao_semanal": metrics["evolucao_semanal"],
            "insights": insights_resp.get("insights", []),
            "timeline": timeline_rows
        }

        pdf_bytes = build_pdf_report(report_payload)
        file_path = os.path.join(job_manager.temp_dir, f"report_{job_id}.pdf")
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        job_manager.update_job_status(job_id, "pronto", file_path=file_path)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[REPORT WORKER ERR] Job {job_id}: {e}")
        job_manager.update_job_status(job_id, "erro", error=str(e))

@app.post("/v1/relatorios", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(verify_internal_key)])
def create_report_job(req: ReportRequest, background_tasks: BackgroundTasks):
    try:
        job_id = job_manager.create_job(req.id_usuario, req.semana_inicio)
        background_tasks.add_task(generate_report_worker, job_id, req.id_usuario, req.semana_inicio)
        return {
            "id_job": job_id,
            "status": "na_fila",
            "mensagem": "Geração do relatório iniciada em segundo plano."
        }
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitos relatórios simultâneos em processamento. Aguarde alguns segundos."
        )

@app.get("/v1/relatorios/{id_job}", dependencies=[Depends(verify_internal_key)])
def get_report_job_status(id_job: str, id_usuario: int = Query(...)):
    job = job_manager.get_job(id_job, id_usuario)
    if not job:
        raise HTTPException(status_code=404, detail="Job de relatório não encontrado.")
    return job

@app.get("/v1/relatorios/{id_job}/arquivo", dependencies=[Depends(verify_internal_key)])
def download_report_file(id_job: str, id_usuario: int = Query(...)):
    file_path = job_manager.get_job_file(id_job, id_usuario)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo do relatório ainda não está pronto ou expirou.")

    filename = f"EduTrack_Relatorio_{id_job}.pdf"
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename
    )
