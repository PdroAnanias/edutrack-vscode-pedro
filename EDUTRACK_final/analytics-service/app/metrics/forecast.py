# ============================================================================
# EduTrack AI v2 - analytics-service/app/metrics/forecast.py
# Velocidade de estudo, fator de ajuste e previsão de conclusão com folga e confiança
# ============================================================================

from typing import List, Dict, Any, Tuple
from datetime import datetime, date, timedelta

def calculate_velocity(weekly_history: List[Dict[str, Any]]) -> Tuple[float, float]:
    """
    Calcula a velocidade média ponderada com base nas últimas 4 semanas completas
    (desconsiderando a semana atual parcial).
    Pesos: 4, 3, 2, 1 (semana mais recente = 4).
    """
    if not weekly_history:
        return 0.0, 0.0

    # Ordenar por data da semana decrescente
    sorted_history = sorted(weekly_history, key=lambda x: str(x.get("semana_inicio")), reverse=True)
    
    # Pular a primeira semana se for a semana corrente parcial
    completed_weeks = sorted_history[1:5] if len(sorted_history) > 1 else sorted_history[:4]
    
    if not completed_weeks:
        return 0.0, 0.0

    pesos = [4, 3, 2, 1][:len(completed_weeks)]
    soma_pesos = sum(pesos)

    horas_pond = sum(float(w.get("horas_reais", 0.0) or 0.0) * p for w, p in zip(completed_weeks, pesos))
    tarefas_pond = sum(float(w.get("tarefas_concluidas", 0) or 0.0) * p for w, p in zip(completed_weeks, pesos))

    vel_horas = float(round(horas_pond / soma_pesos, 1))
    vel_tarefas = float(round(tarefas_pond / soma_pesos, 1))

    return vel_horas, vel_tarefas

def calculate_adjustment_factor(completed_tasks_with_sessions: List[Dict[str, Any]]) -> float:
    """
    Fator de ajuste = Σ horas reais ÷ Σ horas estimadas
    Usando apenas tarefas concluídas que tenham estimativa e sessões.
    Limitar entre 0.5 e 3.0. Sem dados suficientes (< 3 tarefas), usar 1.0.
    """
    valid = [
        t for t in completed_tasks_with_sessions
        if t.get("status") in ("Concluida", "Concluída")
        and t.get("horas_estimadas") and float(t["horas_estimadas"]) > 0
        and t.get("horas_reais") and float(t["horas_reais"]) > 0
    ]

    if len(valid) < 3:
        return 1.0

    soma_estimadas = sum(float(t["horas_estimadas"]) for t in valid)
    soma_reais = sum(float(t["horas_reais"]) for t in valid)

    if soma_estimadas == 0:
        return 1.0

    fator = soma_reais / soma_estimadas
    return round(float(min(3.0, max(0.5, fator))), 2)

def calculate_forecast_per_discipline(
    disciplines: List[Dict[str, Any]],
    weighted_tasks: List[Dict[str, Any]],
    velocity_hours_per_week: float,
    today: date,
    completed_weeks_count: int
) -> List[Dict[str, Any]]:
    """
    Previsão de conclusão por disciplina:
    - trabalho_restante_h = Σ peso das pendentes × fator_ajuste
    - semanas_restantes = trabalho_restante_h ÷ velocidade_horas_semana
    - data_prevista_conclusao = hoje + semanas_restantes × 7 dias
    - folga_dias = data_fim − data_prevista_conclusao
    """
    forecasts = []
    
    # Velocidade rateada proporcionalmente por disciplina se houver várias
    active_count = max(1, sum(1 for d in disciplines if not d.get("sem_tarefas", False)))
    vel_h = float(velocity_hours_per_week or 0.0)
    disc_vel_h = float(max(1.0, vel_h / active_count)) if vel_h > 0 else 0.0

    for d in disciplines:
        d_id = d["id_disciplina"]
        d_tasks = [t for t in weighted_tasks if t.get("id_disciplina") == d_id]
        
        pending_tasks = [t for t in d_tasks if t.get("status") not in ("Concluida", "Concluída")]
        completed_tasks = [t for t in d_tasks if t.get("status") in ("Concluida", "Concluída")]
        
        fator_ajuste = calculate_adjustment_factor(completed_tasks)
        soma_peso_pendentes = sum(float(t.get("peso", 0.0)) for t in pending_tasks)
        trabalho_restante_h = float(round(soma_peso_pendentes * fator_ajuste, 1))

        end_date_str = d.get("data_fim")
        end_date = datetime.strptime(str(end_date_str)[:10], "%Y-%m-%d").date() if end_date_str and str(end_date_str) != "None" else today + timedelta(days=60)

        # Situação e previsão
        if len(pending_tasks) == 0:
            situacao = "concluida"
            data_prevista = str(today)
            folga_dias = (end_date - today).days
        elif disc_vel_h == 0.0 or completed_weeks_count < 2:
            situacao = "sem_dados"
            data_prevista = None
            folga_dias = None
        else:
            semanas_restantes = float(trabalho_restante_h) / float(disc_vel_h)
            data_prev = today + timedelta(days=round(semanas_restantes * 7))
            data_prevista = str(data_prev)
            folga_dias = (end_date - data_prev).days

            if end_date < today:
                situacao = "atrasada"
            elif folga_dias >= 0:
                situacao = "no_prazo"
            elif -7 <= folga_dias < 0:
                situacao = "em_risco"
            else:
                situacao = "atrasada"

        # Confiança
        sem_est_count = sum(1 for t in d_tasks if t.get("sem_estimativa", False))
        pct_sem_est = (sem_est_count / len(d_tasks)) if d_tasks else 1.0

        if completed_weeks_count >= 4 and len(completed_tasks) >= 8 and pct_sem_est < 0.25:
            confianca = "alta"
        elif completed_weeks_count >= 2 and len(completed_tasks) >= 4:
            confianca = "media"
        else:
            confianca = "baixa"

        forecasts.append({
            **d,
            "fator_ajuste": fator_ajuste,
            "trabalho_restante_h": trabalho_restante_h,
            "data_prevista_conclusao": data_prevista,
            "folga_dias": folga_dias,
            "situacao_previsao": situacao,
            "confianca": confianca
        })

    return forecasts
