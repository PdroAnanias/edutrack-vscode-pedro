# ============================================================================
# EduTrack AI v2 - analytics-service/app/metrics/time_tracking.py
# Comparativo Estimado vs. Real, evolução semanal e sequência de dias
# ============================================================================

from typing import List, Dict, Any
from datetime import datetime, date, timedelta

def calculate_time_tracking(
    disciplines: List[Dict[str, Any]],
    tasks_with_sessions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Agrupa horas estimadas e horas reais por disciplina e calcula o desvio percentual:
    desvio_pct = (horas_reais - horas_estimadas) / horas_estimadas * 100
    """
    results = []
    for d in disciplines:
        d_id = d["id_disciplina"]
        d_tasks = [t for t in tasks_with_sessions if t.get("id_disciplina") == d_id]
        
        # Considerar tarefas concluídas com estimativa e sessões
        concluidas = [
            t for t in d_tasks 
            if t.get("status") in ("Concluida", "Concluída")
        ]

        est_total = sum(float(t.get("horas_estimadas", 0) or 0) for t in concluidas)
        real_total = sum(float(t.get("horas_reais", 0) or 0) for t in concluidas)

        desvio = None
        if est_total > 0 and real_total > 0:
            desvio = round(((real_total - est_total) / est_total) * 100.0, 1)

        results.append({
            "id_disciplina": d_id,
            "horas_estimadas_total": round(est_total, 1),
            "horas_reais_total": round(real_total, 1),
            "desvio_pct": desvio
        })

    return results

def calculate_study_streak(sessions: List[Dict[str, Any]], today: date) -> int:
    """
    Calcula dias consecutivos com pelo menos uma sessão registrada.
    """
    if not sessions:
        return 0

    session_dates = set()
    for s in sessions:
        inicio = s.get("inicio")
        if inicio:
            if isinstance(inicio, datetime):
                session_dates.add(inicio.date())
            elif isinstance(inicio, str):
                session_dates.add(datetime.fromisoformat(inicio.replace("Z", "")).date())

    streak = 0
    curr = today
    # Se hoje não estudou ainda, verificar se estudou ontem para manter a sequência
    if curr not in session_dates:
        curr = curr - timedelta(days=1)

    while curr in session_dates:
        streak += 1
        curr = curr - timedelta(days=1)

    return streak
