# ============================================================================
# EduTrack AI v2 - analytics-service/app/insights/engine.py
# Orquestrador híbrido de insights (Regras Determinísticas + LLM Gemini)
# ============================================================================

from typing import Dict, Any
from datetime import datetime
from app.insights.rules import evaluate_rules
from app.insights.gemini_adapter import gemini_adapter

def build_insights_response(user_name: str, metrics: Dict[str, Any], mode: str = "regras") -> Dict[str, Any]:
    """
    Gera a resposta estruturada de insights.
    - Se mode == 'regras': avalia regras determinísticas e responde imediatamente.
    - Se mode == 'ia': avalia regras e tenta enriquecer textos via Gemini SDK.
    """
    base_insights = evaluate_rules(metrics)

    if mode == "ia" and gemini_adapter.is_available():
        final_insights = gemini_adapter.enrich_insights(user_name, base_insights)
        fonte = "ia" if any(i.get("fonte") == "ia" for i in final_insights) else "regra"
        status_ia = "pronto" if fonte == "ia" else "indisponivel"
    else:
        final_insights = base_insights
        fonte = "regra"
        status_ia = "desativada" if not gemini_adapter.is_available() else "processando"

    return {
        "gerado_em": datetime.now().isoformat(),
        "fonte_predominante": fonte,
        "status_ia": status_ia,
        "insights": final_insights
    }
