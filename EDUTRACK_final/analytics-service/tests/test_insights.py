# ============================================================================
# EduTrack AI v2 - analytics-service/tests/test_insights.py
# Testes Automatizados do Motor Híbrido de Insights (Regras e Fallback)
# ============================================================================

import pytest
from app.insights.rules import evaluate_rules
from app.insights.engine import build_insights_response

def test_evaluate_rules_desvio_alto():
    """Gera insight de DESVIO_ALTO quando horas gastas ultrapassam 20% do estimado"""
    user_metrics = {
        "user_id": 1,
        "disciplinas": [
            {
                "id_disciplina": 10,
                "nome": "Cálculo Numérico",
                "horas_estimadas_total": 10.0,
                "horas_reais_total": 15.0,
                "desvio_pct": 50.0,
                "situacao_previsao": "no_prazo"
            }
        ],
        "geral": {
            "meta_semanal_horas": 15.0,
            "horas_estudadas_semana": 12.0,
            "sequencia_dias": 3,
            "tarefas": {"atrasadas": 0}
        }
    }
    
    insights = evaluate_rules(user_metrics)
    assert len(insights) > 0
    desvio_insights = [i for i in insights if i["codigo"] == "DESVIO_ALTO"]
    assert len(desvio_insights) == 1
    assert "Cálculo Numérico" in desvio_insights[0]["titulo"] or "Cálculo Numérico" in desvio_insights[0]["texto"]
    assert desvio_insights[0]["severidade"] in ["critical", "warning"]

def test_evaluate_rules_previsao_risco():
    """Gera insight de PREVISAO_RISCO para matérias com previsão em risco ou atrasada"""
    user_metrics = {
        "user_id": 1,
        "disciplinas": [
            {
                "id_disciplina": 20,
                "nome": "Engenharia de Software",
                "horas_estimadas_total": 20.0,
                "horas_reais_total": 20.0,
                "desvio_pct": 0.0,
                "situacao_previsao": "em_risco",
                "folga_dias": -4
            }
        ],
        "geral": {
            "meta_semanal_horas": 15.0,
            "horas_estudadas_semana": 10.0,
            "sequencia_dias": 0,
            "tarefas": {"atrasadas": 2}
        }
    }
    
    insights = evaluate_rules(user_metrics)
    risco_insights = [i for i in insights if i["codigo"] == "PREVISAO_RISCO"]
    assert len(risco_insights) >= 1
    assert risco_insights[0]["severidade"] in ["critical", "warning"]

def test_build_insights_response_fallback_sem_llm():
    """Com modo 'regras', deve responder imediatamente com fonte 'regra'"""
    user_metrics = {
        "user_id": 1,
        "disciplinas": [
            {
                "id_disciplina": 30,
                "nome": "Estruturas de Dados",
                "horas_estimadas_total": 8.0,
                "horas_reais_total": 12.0,
                "desvio_pct": 50.0,
                "situacao_previsao": "no_prazo"
            }
        ],
        "geral": {
            "meta_semanal_horas": 10.0,
            "horas_estudadas_semana": 5.0,
            "sequencia_dias": 1,
            "tarefas": {"atrasadas": 0}
        }
    }
    
    res = build_insights_response("Pedro", user_metrics, mode="regras")
    assert "insights" in res
    assert res["fonte_predominante"] == "regra"
    assert len(res["insights"]) > 0
