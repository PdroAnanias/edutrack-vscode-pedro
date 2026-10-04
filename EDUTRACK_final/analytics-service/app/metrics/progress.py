# ============================================================================
# EduTrack AI v2 - analytics-service/app/metrics/progress.py
# Cálculo de pesos de tarefas, progresso simples e ponderado por disciplina e geral
# ============================================================================

from typing import List, Dict, Any
import numpy as np

def calculate_task_weights(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Calcula o peso de cada tarefa:
    - Se tem horas_estimadas > 0: peso é esse valor.
    - Se não tem: peso é a mediana das estimativas da mesma disciplina.
    - Se nenhuma da disciplina tiver estimativa: peso = 1.0.
    """
    # Agrupar estimativas existentes por disciplina
    disc_estimates: Dict[int, List[float]] = {}
    for t in tasks:
        d_id = t.get("id_disciplina")
        est = t.get("horas_estimadas")
        if d_id not in disc_estimates:
            disc_estimates[d_id] = []
        if est is not None and float(est) > 0:
            disc_estimates[d_id].append(float(est))

    # Calcular mediana por disciplina
    disc_medians: Dict[int, float] = {}
    for d_id, ests in disc_estimates.items():
        if ests:
            disc_medians[d_id] = float(np.median(ests))
        else:
            disc_medians[d_id] = 1.0

    # Atribuir peso e flag sem estimativa
    weighted_tasks = []
    for t in tasks:
        t_copy = dict(t)
        est = t.get("horas_estimadas")
        d_id = t.get("id_disciplina")
        if est is not None and float(est) > 0:
            t_copy["peso"] = float(est)
            t_copy["sem_estimativa"] = False
        else:
            t_copy["peso"] = disc_medians.get(d_id, 1.0)
            t_copy["sem_estimativa"] = True
        weighted_tasks.append(t_copy)

    return weighted_tasks

def calculate_discipline_progress(disciplines: List[Dict[str, Any]], weighted_tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Calcula progresso simples e ponderado por disciplina.
    """
    results = []
    for d in disciplines:
        d_id = d["id_disciplina"]
        d_tasks = [t for t in weighted_tasks if t.get("id_disciplina") == d_id]
        
        total = len(d_tasks)
        if total == 0:
            results.append({
                **d,
                "total_tarefas": 0,
                "concluidas": 0,
                "pendentes": 0,
                "progresso_simples_pct": 0.0,
                "progresso_ponderado_pct": 0.0,
                "sem_tarefas": True,
                "tarefas_sem_estimativa": 0
            })
            continue

        concluidas = [t for t in d_tasks if t.get("status") in ("Concluida", "Concluída")]
        pendentes = total - len(concluidas)
        sem_estimativa_count = sum(1 for t in d_tasks if t.get("sem_estimativa", False))

        soma_peso_total = sum(t["peso"] for t in d_tasks)
        soma_peso_concluidas = sum(t["peso"] for t in concluidas)

        prog_simples = round((len(concluidas) / total) * 100.0, 1)
        prog_ponderado = round((soma_peso_concluidas / soma_peso_total) * 100.0, 1) if soma_peso_total > 0 else 0.0

        results.append({
            **d,
            "total_tarefas": total,
            "concluidas": len(concluidas),
            "pendentes": pendentes,
            "progresso_simples_pct": prog_simples,
            "progresso_ponderado_pct": prog_ponderado,
            "sem_tarefas": False,
            "tarefas_sem_estimativa": sem_estimativa_count
        })

    return results

def calculate_overall_progress(discipline_progress: List[Dict[str, Any]], today_str: str) -> Dict[str, float]:
    """
    Calcula progresso geral ponderado pela carga horária:
    progresso_geral = Σ (carga_horaria × progresso_ponderado) ÷ Σ carga_horaria
    Considera disciplinas ativas (data_fim >= hoje ou pendentes > 0).
    """
    active_discs = [
        d for d in discipline_progress 
        if str(d.get("data_fim", "9999-12-31")) >= today_str or d.get("pendentes", 0) > 0
    ]

    if not active_discs:
        active_discs = discipline_progress

    soma_carga = sum(d.get("carga_horaria", 0) for d in active_discs)
    if soma_carga == 0:
        return {
            "progresso_geral_ponderado_pct": 0.0,
            "progresso_geral_simples_pct": 0.0
        }

    soma_ponderada = sum(
        d.get("carga_horaria", 0) * (d.get("progresso_ponderado_pct", 0.0) / 100.0)
        for d in active_discs
    )
    prog_ponderado_geral = round((soma_ponderada / soma_carga) * 100.0, 1)

    soma_simples = sum(
        d.get("carga_horaria", 0) * (d.get("progresso_simples_pct", 0.0) / 100.0)
        for d in active_discs
    )
    prog_simples_geral = round((soma_simples / soma_carga) * 100.0, 1)

    return {
        "progresso_geral_ponderado_pct": prog_ponderado_geral,
        "progresso_geral_simples_pct": prog_simples_geral
    }
