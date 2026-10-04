# ============================================================================
# EduTrack AI v2 - analytics-service/app/insights/rules.py
# Motor de regras determinísticas para geração de insights e recomendações base
# ============================================================================

from typing import List, Dict, Any

def evaluate_rules(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Avalia as 9 regras da especificação técnica e retorna lista de insights estruturados.
    """
    insights = []
    geral = metrics.get("geral", {})
    disciplinas = metrics.get("disciplinas", [])
    tarefas_geral = geral.get("tarefas", {})

    # 1. DESVIO_ALTO (> +20% / > +50%)
    for d in disciplinas:
        desvio = d.get("desvio_pct")
        if desvio is not None and desvio > 20.0:
            sev = "critical" if desvio > 50.0 else "warning"
            insights.append({
                "id": f"DESVIO_ALTO:{d['id_disciplina']}",
                "codigo": "DESVIO_ALTO",
                "severidade": sev,
                "id_disciplina": d["id_disciplina"],
                "disciplina": d["nome"],
                "titulo": f"{d['nome']} está levando mais tempo que o planejado",
                "texto": f"Você está levando {abs(desvio):.0f}% a mais de tempo em {d['nome']} do que o planejado. Reorganize seu cronograma reservando mais tempo por tarefa ou revise suas estimativas.",
                "fonte": "regra",
                "metricas": {
                    "desvio_pct": desvio,
                    "horas_estimadas": d.get("horas_estimadas_total"),
                    "horas_reais": d.get("horas_reais_total")
                },
                "acao_sugerida": { "tipo": "abrir_disciplina", "id_disciplina": d["id_disciplina"] }
            })

    # 2. DESVIO_BAIXO (< -20%)
    for d in disciplinas:
        desvio = d.get("desvio_pct")
        if desvio is not None and desvio < -20.0:
            insights.append({
                "id": f"DESVIO_BAIXO:{d['id_disciplina']}",
                "codigo": "DESVIO_BAIXO",
                "severidade": "success",
                "id_disciplina": d["id_disciplina"],
                "disciplina": d["nome"],
                "titulo": f"Excelente ritmo em {d['nome']}",
                "texto": f"Você está concluindo {d['nome']} {abs(desvio):.0f}% mais rápido que o estimado. Suas estimativas podem estar folgadas; ajustá-las libera tempo na sua agenda.",
                "fonte": "regra",
                "metricas": { "desvio_pct": desvio },
                "acao_sugerida": { "tipo": "abrir_disciplina", "id_disciplina": d["id_disciplina"] }
            })

    # 3. PREVISAO_RISCO
    for d in disciplinas:
        sit = d.get("situacao_previsao")
        folga = d.get("folga_dias")
        if sit in ("em_risco", "atrasada"):
            sev = "critical" if sit == "atrasada" else "warning"
            data_prev = d.get("data_prevista_conclusao") or "data indefinida"
            insights.append({
                "id": f"PREVISAO_RISCO:{d['id_disciplina']}",
                "codigo": "PREVISAO_RISCO",
                "severidade": sev,
                "id_disciplina": d["id_disciplina"],
                "disciplina": d["nome"],
                "titulo": f"Risco de conclusão em {d['nome']}",
                "texto": f"No ritmo atual, a conclusão prevista para {d['nome']} é em {data_prev} (folga de {folga if folga is not None else 0} dias). Considere aumentar a dedicação semanal nesta matéria.",
                "fonte": "regra",
                "metricas": { "folga_dias": folga, "data_prevista": data_prev },
                "acao_sugerida": { "tipo": "abrir_disciplina", "id_disciplina": d["id_disciplina"] }
            })

    # 4. ATRASADAS
    atrasadas = tarefas_geral.get("atrasadas", 0)
    if atrasadas > 0:
        insights.append({
            "id": "ATRASADAS",
            "codigo": "ATRASADAS",
            "severidade": "critical",
            "id_disciplina": None,
            "disciplina": None,
            "titulo": "Tarefas com prazo vencido",
            "texto": f"Você possui {atrasadas} tarefa(s) atrasada(s). Que tal reservar um bloco de foco hoje para resolver a pendência mais urgente?",
            "fonte": "regra",
            "metricas": { "atrasadas": atrasadas },
            "acao_sugerida": { "tipo": "abrir_tarefas", "filtro": "atrasadas" }
        })

    # 5. PRAZO_PROXIMO
    vencendo_7 = tarefas_geral.get("vencendo_7_dias", 0)
    if vencendo_7 > 0:
        insights.append({
            "id": "PRAZO_PROXIMO",
            "codigo": "PRAZO_PROXIMO",
            "severidade": "warning",
            "id_disciplina": None,
            "disciplina": None,
            "titulo": "Prazos nos próximos 7 dias",
            "texto": f"{vencendo_7} tarefa(s) vencem nos próximos 7 dias. Organize suas entregas prioritárias para não acumular prazos.",
            "fonte": "regra",
            "metricas": { "vencendo_7_dias": vencendo_7 },
            "acao_sugerida": { "tipo": "abrir_tarefas", "filtro": "proximas" }
        })

    # 6. META_SEMANAL
    pct_meta = geral.get("percentual_meta_semanal", 0.0)
    meta_h = geral.get("meta_semanal_horas", 10.0)
    horas_atuais = geral.get("horas_semana_atual", 0.0)
    if pct_meta < 50.0 and meta_h > 0:
        faltam = max(0.0, round(meta_h - horas_atuais, 1))
        insights.append({
            "id": "META_SEMANAL",
            "codigo": "META_SEMANAL",
            "severidade": "info",
            "id_disciplina": None,
            "disciplina": None,
            "titulo": "Acompanhamento da Meta Semanal",
            "texto": f"Você estudou {horas_atuais:.1f}h de {meta_h:.1f}h da sua meta semanal. Faltam {faltam:.1f}h para atingir 100% de dedicação até domingo.",
            "fonte": "regra",
            "metricas": { "horas_atuais": horas_atuais, "meta_horas": meta_h, "faltam": faltam },
            "acao_sugerida": { "tipo": "abrir_dashboard" }
        })

    # 7. SEQUENCIA
    sequencia = geral.get("sequencia_dias", 0)
    if sequencia >= 3:
        insights.append({
            "id": "SEQUENCIA",
            "codigo": "SEQUENCIA",
            "severidade": "success",
            "id_disciplina": None,
            "disciplina": None,
            "titulo": "Sequência de estudos ativa!",
            "texto": f"Parabéns! Você está há {sequencia} dias seguidos mantendo o hábito de estudar. Continue firme no ritmo.",
            "fonte": "regra",
            "metricas": { "sequencia_dias": sequencia },
            "acao_sugerida": None
        })

    # 8. SEM_ESTIMATIVA
    total_sem_est = sum(d.get("tarefas_sem_estimativa", 0) for d in disciplinas)
    total_pendentes = tarefas_geral.get("pendentes", 0)
    if total_pendentes > 0 and (total_sem_est / total_pendentes) > 0.3:
        insights.append({
            "id": "SEM_ESTIMATIVA",
            "codigo": "SEM_ESTIMATIVA",
            "severidade": "info",
            "id_disciplina": None,
            "disciplina": None,
            "titulo": "Estime o tempo das suas tarefas",
            "texto": "Estimar as horas das suas tarefas melhora a acurácia das previsões de término e o cálculo da sua velocidade.",
            "fonte": "regra",
            "metricas": { "sem_estimativa": total_sem_est },
            "acao_sugerida": { "tipo": "abrir_tarefas" }
        })

    # Ordenação por severidade: critical > warning > info > success
    sev_weights = { "critical": 4, "warning": 3, "info": 2, "success": 1 }
    insights.sort(key=lambda x: sev_weights.get(x["severidade"], 0), reverse=True)

    # Limitar aos primeiros 6 insights sem duplicar id
    unique_insights = []
    seen = set()
    for ins in insights:
        if ins["id"] not in seen:
            seen.add(ins["id"])
            unique_insights.append(ins)
        if len(unique_insights) >= 6:
            break

    return unique_insights
