# ============================================================================
# EduTrack AI v2 - analytics-service/tests/test_reports.py
# Testes Automatizados da Geração de Relatórios em PDF
# ============================================================================

import pytest
from app.reports.generator import build_pdf_report

def test_build_pdf_report_generates_valid_pdf():
    """Gera um PDF completo com todas as seções e valida os bytes retornados"""
    report_data = {
        "aluno_nome": "Pedro Ananias",
        "curso_nome": "Ciência da Computação",
        "periodo_str": "Semana de 28/09/2026 a 04/10/2026",
        "kpi": {
            "concluidas": 4,
            "adicionadas": 6,
            "atrasadas": 1,
            "horas_estudadas": 14.5,
            "meta_pct": 96.0,
            "sequencia_dias": 5
        },
        "horas_por_dia": [
            {"dia": "Seg", "horas": 3.0},
            {"dia": "Ter", "horas": 2.5},
            {"dia": "Qua", "horas": 4.0},
            {"dia": "Qui", "horas": 1.0},
            {"dia": "Sex", "horas": 2.0},
            {"dia": "Sáb", "horas": 2.0},
            {"dia": "Dom", "horas": 0.0},
        ],
        "progresso_disciplinas": [
            {"disciplina": "Algoritmos", "progresso": 75.0},
            {"disciplina": "Banco de Dados", "progresso": 60.0},
            {"disciplina": "Redes", "progresso": 40.0}
        ],
        "evolucao_semanal": [
            {"semana": "Sem 1", "horas": 10.0, "meta": 15.0},
            {"semana": "Sem 2", "horas": 12.0, "meta": 15.0},
            {"semana": "Sem 3", "horas": 14.5, "meta": 15.0}
        ],
        "distribuicao_horas": [
            {"disciplina": "Algoritmos", "horas": 8.0},
            {"disciplina": "Banco de Dados", "horas": 4.5},
            {"disciplina": "Redes", "horas": 2.0}
        ],
        "tarefas_semana": [
            {"titulo": "Implementar Árvore AVL", "disciplina": "Algoritmos", "status": "Concluída", "tempo": "4.0h"},
            {"titulo": "Modelagem Lógica", "disciplina": "Banco de Dados", "status": "Concluída", "tempo": "2.5h"},
            {"titulo": "Laboratório Wireshark", "disciplina": "Redes", "status": "Pendente", "tempo": "1.0h"}
        ],
        "estimado_vs_real": [
            {"disciplina": "Algoritmos", "estimado": "6.0h", "real": "8.0h", "desvio": "+33%"},
            {"disciplina": "Banco de Dados", "estimado": "5.0h", "real": "4.5h", "desvio": "-10%"}
        ],
        "insights_lista": [
            {"titulo": "Atenção em Algoritmos", "texto": "Você gastou 33% a mais do que o planejado. Reorganize suas estimativas.", "fonte": "IA"}
        ],
        "timeline": [
            {"data": "03/10/2026 15:30", "descricao": "Sessão de estudo registrada: 2h em Algoritmos"}
        ]
    }

    pdf_bytes = build_pdf_report(report_data)

    assert pdf_bytes is not None
    assert len(pdf_bytes) > 1000 # PDF válido não vazio
    assert pdf_bytes.startswith(b'%PDF-') # Assinatura padrão de arquivo PDF
