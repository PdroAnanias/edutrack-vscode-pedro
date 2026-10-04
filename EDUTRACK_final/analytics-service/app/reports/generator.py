# ============================================================================
# EduTrack AI v2 - analytics-service/app/reports/generator.py
# Gerador de Relatório Semanal em PDF usando ReportLab (A4, 9 seções)
# ============================================================================

import os
import io
from datetime import datetime, date, timedelta
from typing import Dict, Any, List

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas

from app.reports.charts import (
    chart_hours_per_day,
    chart_progress_per_discipline,
    chart_six_weeks_evolution,
    chart_distribution_donut
)

# Cores da Identidade Visual
COLOR_NAVY = colors.HexColor("#2C2E4C")
COLOR_GOLD = colors.HexColor("#C8B755")
COLOR_LIGHT_BG = colors.HexColor("#E7ECEF")
COLOR_GRAY_TEXT = colors.HexColor("#4A4D70")
COLOR_WHITE = colors.HexColor("#FFFFFF")
COLOR_RED = colors.HexColor("#D32F2F")
COLOR_GREEN = colors.HexColor("#2E7D32")

class NumberedCanvas(canvas.Canvas):
    """Canvas com paginação 'Página X de Y' e cabeçalho/rodapé padronizados"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_GRAY_TEXT)

        # Cabeçalho (Páginas > 1)
        if self._pageNumber > 1:
            self.drawString(18 * mm, 285 * mm, "EduTrack AI — Relatório Semanal de Estudos")
            self.setStrokeColor(COLOR_LIGHT_BG)
            self.setLineWidth(0.5)
            self.line(18 * mm, 283 * mm, 192 * mm, 283 * mm)

        # Rodapé (Todas as páginas)
        now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.setStrokeColor(COLOR_LIGHT_BG)
        self.setLineWidth(0.5)
        self.line(18 * mm, 16 * mm, 192 * mm, 16 * mm)
        self.drawString(18 * mm, 12 * mm, f"Gerado em {now_str} (Horário de Brasília)")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(192 * mm, 12 * mm, page_str)
        self.restoreState()

def build_pdf_report(report_data: Dict[str, Any]) -> bytes:
    """
    Constrói o documento PDF A4 completo em memória
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title="EduTrack AI - Relatório Semanal de Estudos",
        author="EduTrack AI",
        subject="Relatório Acadêmico Semanal"
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ReportTitle", fontName="Helvetica-Bold", fontSize=18, textColor=COLOR_WHITE, leading=22)
    subtitle_style = ParagraphStyle("ReportSubtitle", fontName="Helvetica", fontSize=10, textColor=COLOR_LIGHT_BG, leading=14)
    h2_style = ParagraphStyle("Heading2", fontName="Helvetica-Bold", fontSize=13, textColor=COLOR_NAVY, spaceBefore=12, spaceAfter=6)
    body_style = ParagraphStyle("Body", fontName="Helvetica", fontSize=9, textColor=COLOR_NAVY, leading=12)
    body_bold = ParagraphStyle("BodyBold", fontName="Helvetica-Bold", fontSize=9, textColor=COLOR_NAVY, leading=12)
    kpi_val_style = ParagraphStyle("KPIVal", fontName="Helvetica-Bold", fontSize=15, textColor=COLOR_NAVY, alignment=1)
    kpi_lbl_style = ParagraphStyle("KPILbl", fontName="Helvetica", fontSize=7, textColor=COLOR_GRAY_TEXT, alignment=1)

    elements = []

    # ==================== 1. CAPA / CABEÇALHO ====================
    aluno_nome = report_data.get("aluno_nome", "Estudante")
    curso_nome = report_data.get("curso_nome", "Ciência da Computação")
    periodo_str = report_data.get("periodo_str", "Semana Atual")

    header_content = [
        [
            Paragraph("<b>EduTrack AI</b>", title_style),
            Paragraph(f"<b>Relatório Semanal de Estudos</b><br/>{periodo_str}", ParagraphStyle("RightHeader", fontName="Helvetica", fontSize=10, textColor=COLOR_GOLD, alignment=2, leading=14))
        ],
        [
            Paragraph(f"Aluno: <b>{aluno_nome}</b> &nbsp;|&nbsp; Curso: <b>{curso_nome}</b>", subtitle_style),
            Paragraph(f"Emitido em: {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle("RightDate", fontName="Helvetica", fontSize=8, textColor=COLOR_LIGHT_BG, alignment=2))
        ]
    ]
    header_table = Table(header_content, colWidths=[110 * mm, 64 * mm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))

    # ==================== 2. RESUMO DA SEMANA (KPIS) ====================
    kpi_data = report_data.get("kpi", {})
    kpi_cells = [
        [
            Paragraph(str(kpi_data.get("concluidas", 0)), kpi_val_style),
            Paragraph(str(kpi_data.get("adicionadas", 0)), kpi_val_style),
            Paragraph(str(kpi_data.get("atrasadas", 0)), kpi_val_style),
            Paragraph(f"{kpi_data.get('horas_estudadas', 0.0):.1f}h", kpi_val_style),
            Paragraph(f"{kpi_data.get('meta_pct', 0.0):.0f}%", kpi_val_style),
            Paragraph(f"{kpi_data.get('sequencia_dias', 0)}d", kpi_val_style)
        ],
        [
            Paragraph("Concluídas", kpi_lbl_style),
            Paragraph("Adicionadas", kpi_lbl_style),
            Paragraph("Atrasadas", kpi_lbl_style),
            Paragraph("Horas Reais", kpi_lbl_style),
            Paragraph("% Meta", kpi_lbl_style),
            Paragraph("Sequência", kpi_lbl_style)
        ]
    ]
    kpi_table = Table(kpi_cells, colWidths=[29 * mm] * 6)
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_GOLD),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D8DFE4")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 10))

    # ==================== 3. TAREFAS CONCLUÍDAS NA SEMANA ====================
    elements.append(Paragraph("1. Tarefas Concluídas na Semana", h2_style))
    concluidas = report_data.get("tarefas_concluidas", [])
    if concluidas:
        c_rows = [[
            Paragraph("<b>Tarefa</b>", body_bold),
            Paragraph("<b>Disciplina</b>", body_bold),
            Paragraph("<b>Conclusão</b>", body_bold),
            Paragraph("<b>Estimado</b>", body_bold),
            Paragraph("<b>Real</b>", body_bold),
            Paragraph("<b>Desvio</b>", body_bold)
        ]]
        for t in concluidas:
            desv = t.get("desvio_pct")
            desv_str = f"{desv:+.1f}%" if desv is not None else "-"
            c_rows.append([
                Paragraph(t.get("titulo", "")[:32], body_style),
                Paragraph(t.get("disciplina", "")[:24], body_style),
                Paragraph(str(t.get("concluida_em", ""))[:10], body_style),
                Paragraph(f"{t.get('horas_estimadas', 0):.1f}h", body_style),
                Paragraph(f"{t.get('horas_reais', 0):.1f}h", body_style),
                Paragraph(desv_str, body_style)
            ])
        t_concl = Table(c_rows, colWidths=[48 * mm, 42 * mm, 24 * mm, 20 * mm, 20 * mm, 20 * mm], repeatRows=1)
        t_concl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BG),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_concl)
    else:
        elements.append(Paragraph("<i>Nenhuma tarefa concluída no período selecionado.</i>", body_style))
    elements.append(Spacer(1, 10))

    # ==================== 4. TAREFAS ATRASADAS ====================
    elements.append(Paragraph("2. Tarefas com Prazo Vencido", h2_style))
    atrasadas = report_data.get("tarefas_atrasadas", [])
    if atrasadas:
        a_rows = [[
            Paragraph("<b>Tarefa</b>", body_bold),
            Paragraph("<b>Disciplina</b>", body_bold),
            Paragraph("<b>Prazo Previsto</b>", body_bold),
            Paragraph("<b>Dias de Atraso</b>", body_bold)
        ]]
        for t in atrasadas:
            a_rows.append([
                Paragraph(t.get("titulo", "")[:35], body_style),
                Paragraph(t.get("disciplina", "")[:25], body_style),
                Paragraph(str(t.get("data_prevista", ""))[:10], body_style),
                Paragraph(f"<b>{t.get('dias_atraso', 0)} dias</b>", ParagraphStyle("RedTxt", fontName="Helvetica", fontSize=9, textColor=COLOR_RED))
            ])
        t_atras = Table(a_rows, colWidths=[65 * mm, 50 * mm, 30 * mm, 29 * mm], repeatRows=1)
        t_atras.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#FFEBEE")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#FFCDD2")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_atras)
    else:
        elements.append(Paragraph("<i>Nenhuma tarefa em atraso registrada nesta semana. Parabéns!</i>", body_style))
    elements.append(Spacer(1, 10))

    # ==================== 5. GRÁFICOS ANALÍTICOS ====================
    elements.append(PageBreak())
    elements.append(Paragraph("3. Painel Gráfico de Desempenho", h2_style))

    daily_hours = report_data.get("horas_por_dia", {})
    if isinstance(daily_hours, list):
        daily_hours = {item.get("dia"): item.get("horas", 0.0) for item in daily_hours if isinstance(item, dict)}
    daily_goal = report_data.get("meta_diaria", 2.0)
    chart1_bytes = chart_hours_per_day(daily_hours, daily_goal)

    disc_prog = report_data.get("progresso_disciplinas", [])
    chart2_bytes = chart_progress_per_discipline(disc_prog)

    six_weeks = report_data.get("evolucao_semanal", [])
    meta_sem = report_data.get("meta_semanal", 10.0)
    chart3_bytes = chart_six_weeks_evolution(six_weeks, meta_sem)

    chart4_bytes = chart_distribution_donut(disc_prog)

    img1 = Image(io.BytesIO(chart1_bytes), width=85 * mm, height=45 * mm)
    img2 = Image(io.BytesIO(chart2_bytes), width=85 * mm, height=45 * mm)
    img3 = Image(io.BytesIO(chart3_bytes), width=85 * mm, height=45 * mm)
    img4 = Image(io.BytesIO(chart4_bytes), width=85 * mm, height=45 * mm)

    charts_table = Table([
        [Paragraph("<b>Horas Estudadas por Dia</b>", body_bold), Paragraph("<b>Progresso Ponderado por Matéria</b>", body_bold)],
        [img1, img2],
        [Paragraph("<b>Evolução das Últimas 6 Semanas</b>", body_bold), Paragraph("<b>Distribuição de Carga Horária</b>", body_bold)],
        [img3, img4]
    ], colWidths=[87 * mm, 87 * mm])
    charts_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(charts_table)
    elements.append(Spacer(1, 12))

    # ==================== 6. INSIGHTS E RECOMENDAÇÕES DA IA ====================
    elements.append(Paragraph("4. Insights e Recomendações Inteligentes", h2_style))
    insights = report_data.get("insights", [])
    if insights:
        for ins in insights:
            sev = ins.get("severidade", "info")
            badge_color = COLOR_RED if sev == "critical" else (COLOR_GOLD if sev == "warning" else COLOR_GREEN)
            ins_block = [
                [
                    Paragraph(f"● <b>{ins.get('titulo', '')}</b>", ParagraphStyle("InsT", fontName="Helvetica-Bold", fontSize=9, textColor=COLOR_NAVY)),
                    Paragraph(f"<b>[{sev.upper()}]</b>", ParagraphStyle("InsS", fontName="Helvetica-Bold", fontSize=8, textColor=badge_color, alignment=2))
                ],
                [
                    Paragraph(ins.get("texto", ""), ParagraphStyle("InsB", fontName="Helvetica", fontSize=8, textColor=COLOR_NAVY, leading=11)),
                    ""
                ]
            ]
            t_ins = Table(ins_block, colWidths=[140 * mm, 34 * mm])
            t_ins.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
                ('BOX', (0, 0), (-1, -1), 0.5, badge_color),
                ('SPAN', (0, 1), (1, 1)),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(t_ins)
            elements.append(Spacer(1, 4))
    else:
        elements.append(Paragraph("<i>Nenhuma recomendação especial para este período.</i>", body_style))

    # ==================== 7. LINHA DO TEMPO DE ATIVIDADES ====================
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("5. Linha do Tempo de Atividades da Semana", h2_style))
    timeline = report_data.get("timeline", [])
    if timeline:
        t_rows = [[
            Paragraph("<b>Data/Hora</b>", body_bold),
            Paragraph("<b>Tipo</b>", body_bold),
            Paragraph("<b>Descrição do Evento</b>", body_bold)
        ]]
        for ev in timeline[:40]:
            t_rows.append([
                Paragraph(str(ev.get("criado_em", ""))[:16].replace("T", " "), body_style),
                Paragraph(str(ev.get("tipo", "")).replace("_", " "), ParagraphStyle("EvT", fontName="Helvetica", fontSize=7, textColor=COLOR_GRAY_TEXT)),
                Paragraph(ev.get("descricao", ""), body_style)
            ])
        t_time = Table(t_rows, colWidths=[32 * mm, 36 * mm, 106 * mm], repeatRows=1)
        t_time.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BG),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(t_time)
        if len(timeline) > 40:
            elements.append(Paragraph(f"<i>Exibindo as 40 atividades mais recentes de um total de {len(timeline)}.</i>", ParagraphStyle("Subt", fontName="Helvetica-Oblique", fontSize=8, textColor=COLOR_GRAY_TEXT)))
    else:
        elements.append(Paragraph("<i>Nenhuma atividade registrada no histórico deste período.</i>", body_style))

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
