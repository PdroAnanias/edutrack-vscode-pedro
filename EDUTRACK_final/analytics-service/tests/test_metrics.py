# ============================================================================
# EduTrack AI v2 - analytics-service/tests/test_metrics.py
# Testes automatizados unitários para métricas, previsões e regras de insights
# ============================================================================

import pytest
from datetime import date, timedelta
from app.metrics.progress import (
    calculate_task_weights,
    calculate_discipline_progress,
    calculate_overall_progress
)
from app.metrics.forecast import (
    calculate_velocity,
    calculate_adjustment_factor,
    calculate_forecast_per_discipline
)
from app.insights.rules import evaluate_rules
from app.reports.generator import build_pdf_report

def test_overall_progress_weighted_example():
    """
    Exemplo da Seção 4.3 c da Especificação:
    Disciplina A (carga 80 h, ponderado 50%) e B (carga 40 h, ponderado 20%)
    -> (80×0,5 + 40×0,2) ÷ 120 = 40.0% (O simples daria 35%)
    """
    discs = [
        { "id_disciplina": 1, "carga_horaria": 80, "progresso_ponderado_pct": 50.0, "progresso_simples_pct": 50.0, "data_fim": "2026-12-31", "pendentes": 1 },
        { "id_disciplina": 2, "carga_horaria": 40, "progresso_ponderado_pct": 20.0, "progresso_simples_pct": 20.0, "data_fim": "2026-12-31", "pendentes": 1 }
    ]
    res = calculate_overall_progress(discs, "2026-10-01")
    assert res["progresso_geral_ponderado_pct"] == 40.0

def test_task_weights_median_fallback():
    tasks = [
        { "id_disciplina": 1, "horas_estimadas": 4.0 },
        { "id_disciplina": 1, "horas_estimadas": 6.0 },
        { "id_disciplina": 1, "horas_estimadas": None }, # deve receber a mediana = 5.0
    ]
    weighted = calculate_task_weights(tasks)
    assert weighted[0]["peso"] == 4.0
    assert weighted[1]["peso"] == 6.0
    assert weighted[2]["peso"] == 5.0
    assert weighted[2]["sem_estimativa"] is True

def test_velocity_calculation():
    weekly_history = [
        { "semana_inicio": "2026-10-05", "horas_reais": 2.0, "tarefas_concluidas": 1 }, # corrente parcial (pulada)
        { "semana_inicio": "2026-09-28", "horas_reais": 10.0, "tarefas_concluidas": 4 }, # peso 4
        { "semana_inicio": "2026-09-21", "horas_reais": 8.0, "tarefas_concluidas": 3 },  # peso 3
        { "semana_inicio": "2026-09-14", "horas_reais": 6.0, "tarefas_concluidas": 2 },  # peso 2
        { "semana_inicio": "2026-09-07", "horas_reais": 4.0, "tarefas_concluidas": 1 }   # peso 1
    ]
    # (10*4 + 8*3 + 6*2 + 4*1) / (4+3+2+1) = (40 + 24 + 12 + 4) / 10 = 80 / 10 = 8.0h
    vel_h, vel_t = calculate_velocity(weekly_history)
    assert vel_h == 8.0
    assert vel_t == 3.0

def test_adjustment_factor_bounds():
    # Menos de 3 tarefas -> 1.0
    assert calculate_adjustment_factor([{"status": "Concluida", "horas_estimadas": 2, "horas_reais": 4}]) == 1.0

    # 3 tarefas com soma_real = 15, soma_estimada = 10 -> fator = 1.5
    tasks = [
        {"status": "Concluida", "horas_estimadas": 4, "horas_reais": 6},
        {"status": "Concluida", "horas_estimadas": 3, "horas_reais": 4.5},
        {"status": "Concluida", "horas_estimadas": 3, "horas_reais": 4.5}
    ]
    assert calculate_adjustment_factor(tasks) == 1.5

def test_forecast_verification_example():
    """
    Exemplo da Seção 4.3 e:
    Pendentes somam 10 h, fator_ajuste 1.2 -> restante 12 h; velocidade 5 h/semana -> 2.4 semanas (~17 dias).
    """
    today = date(2026, 10, 1)
    discs = [{ "id_disciplina": 1, "nome": "Test", "carga_horaria": 60, "data_fim": "2026-11-15", "sem_tarefas": False }]
    weighted_tasks = [
        {"id_disciplina": 1, "status": "Pendente", "peso": 10.0, "sem_estimativa": False},
        # 3 concluídas para fator 1.2 (estimadas 10, reais 12)
        {"id_disciplina": 1, "status": "Concluida", "horas_estimadas": 5.0, "horas_reais": 6.0, "peso": 5.0},
        {"id_disciplina": 1, "status": "Concluida", "horas_estimadas": 2.5, "horas_reais": 3.0, "peso": 2.5},
        {"id_disciplina": 1, "status": "Concluida", "horas_estimadas": 2.5, "horas_reais": 3.0, "peso": 2.5}
    ]
    res = calculate_forecast_per_discipline(discs, weighted_tasks, velocity_hours_per_week=5.0, today=today, completed_weeks_count=4)
    item = res[0]
    assert item["fator_ajuste"] == 1.2
    assert item["trabalho_restante_h"] == 12.0
    # 2.4 semanas * 7 dias = 16.8 -> 17 dias
    expected_date = today + timedelta(days=17)
    assert item["data_prevista_conclusao"] == str(expected_date)
    assert item["situacao_previsao"] == "no_prazo"
    assert item["confianca"] == "baixa"

def test_rules_evaluation():
    mock_metrics = {
        "geral": {
            "percentual_meta_semanal": 30.0,
            "meta_semanal_horas": 10.0,
            "horas_semana_atual": 3.0,
            "sequencia_dias": 4,
            "tarefas": { "atrasadas": 2, "vencendo_7_dias": 3, "pendentes": 5 }
        },
        "disciplinas": [
            {
                "id_disciplina": 1,
                "nome": "Python",
                "desvio_pct": 35.0,
                "horas_estimadas_total": 10.0,
                "horas_reais_total": 13.5,
                "situacao_previsao": "em_risco",
                "folga_dias": -3,
                "tarefas_sem_estimativa": 0
            }
        ]
    }
    insights = evaluate_rules(mock_metrics)
    codigos = [i["codigo"] for i in insights]
    assert "DESVIO_ALTO" in codigos
    assert "PREVISAO_RISCO" in codigos
    assert "ATRASADAS" in codigos
    assert "PRAZO_PROXIMO" in codigos
    assert "META_SEMANAL" in codigos
    assert "SEQUENCIA" in codigos

def test_pdf_report_generation_non_empty():
    report_data = {
        "aluno_nome": "Pedro Teste",
        "curso_nome": "Ciência da Computação",
        "periodo_str": "28/09/2026 a 04/10/2026",
        "kpi": { "concluidas": 3, "adicionadas": 5, "atrasadas": 0, "horas_estudadas": 8.5, "meta_pct": 85.0, "sequencia_dias": 3 },
        "tarefas_concluidas": [
            { "titulo": "Lista 1", "disciplina": "Python", "concluida_em": "2026-10-02", "horas_estimadas": 2.0, "horas_reais": 2.5, "desvio_pct": 25.0 }
        ],
        "tarefas_atrasadas": [],
        "horas_por_dia": { "Seg": 2.0, "Ter": 1.5, "Qua": 2.0, "Qui": 3.0, "Sex": 0.0, "Sáb": 0.0, "Dom": 0.0 },
        "meta_diaria": 1.4,
        "meta_semanal": 10.0,
        "progresso_disciplinas": [
            { "nome": "Python", "progresso_ponderado_pct": 45.0, "horas_reais_total": 8.5 }
        ],
        "evolucao_semanal": [
            { "semana_inicio": "2026-09-28", "horas_reais": 8.5, "tarefas_concluidas": 3 }
        ],
        "insights": [
            { "titulo": "Ritmo em Python", "severidade": "warning", "texto": "Você está dedicando mais tempo em Python." }
        ],
        "timeline": [
            { "criado_em": "2026-10-02T15:00:00", "tipo": "TAREFA_CONCLUIDA", "descricao": "Lista 1 concluída" }
        ]
    }
    pdf_bytes = build_pdf_report(report_data)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")
