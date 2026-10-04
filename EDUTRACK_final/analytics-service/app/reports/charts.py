# ============================================================================
# EduTrack AI v2 - analytics-service/app/reports/charts.py
# Geração de gráficos analíticos em alta resolução (PNG) usando Matplotlib
# Paleta: #2C2E4C (principal), #C8B755 (destaque/dourado), #E7ECEF (fundo)
# ============================================================================

import io
from typing import List, Dict, Any
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

COLOR_PRIMARY = "#2C2E4C"
COLOR_ACCENT = "#C8B755"
COLOR_BG = "#FFFFFF"
COLOR_MUTED = "#8A8D9F"
COLOR_SUCCESS = "#2E7D32"
COLOR_DANGER = "#D32F2F"

def chart_hours_per_day(daily_hours: Dict[str, float], daily_goal: float = 2.0) -> bytes:
    """Gráfico de barras: horas estudadas por dia da semana com meta tracejada"""
    days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    hours = [daily_hours.get(d, 0.0) for d in days]

    fig, ax = plt.subplots(figsize=(6, 2.5), dpi=200)
    fig.patch.set_facecolor(COLOR_BG)
    ax.set_facecolor(COLOR_BG)

    bars = ax.bar(days, hours, color=COLOR_PRIMARY, width=0.55, edgecolor=COLOR_PRIMARY, zorder=3)
    ax.axhline(daily_goal, color=COLOR_ACCENT, linestyle="--", linewidth=1.5, label=f"Meta ({daily_goal:.1f}h)", zorder=4)

    for bar in bars:
        h = bar.get_height()
        if h > 0:
            ax.annotate(f"{h:.1f}h",
                        xy=(bar.get_x() + bar.get_width() / 2, h),
                        xytext=(0, 3), textcoords="offset points",
                        ha="center", va="bottom", fontsize=8, color=COLOR_PRIMARY, fontweight="bold")

    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(COLOR_MUTED)
    ax.spines['bottom'].set_color(COLOR_MUTED)
    ax.grid(axis='y', linestyle=':', alpha=0.6, zorder=0)
    ax.set_ylabel("Horas", fontsize=9, color=COLOR_PRIMARY)
    ax.tick_params(colors=COLOR_PRIMARY, labelsize=8)
    ax.legend(loc="upper right", frameon=False, fontsize=8)
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=200)
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()

def chart_progress_per_discipline(disciplines: List[Dict[str, Any]]) -> bytes:
    """Gráfico de barras horizontais: progresso ponderado por disciplina (0-100%)"""
    fig, ax = plt.subplots(figsize=(6, max(2.0, len(disciplines) * 0.45)), dpi=200)
    fig.patch.set_facecolor(COLOR_BG)
    ax.set_facecolor(COLOR_BG)

    def get_name(d):
        return d.get("nome", d.get("disciplina", "Disciplina"))

    names = [get_name(d)[:22] + "..." if len(get_name(d)) > 22 else get_name(d) for d in reversed(disciplines)]
    progs = [float(d.get("progresso_ponderado_pct", d.get("progresso", 0.0)) or 0.0) for d in reversed(disciplines)]

    y_pos = np.arange(len(names))
    bars = ax.barh(y_pos, progs, color=COLOR_ACCENT, height=0.5, edgecolor=COLOR_ACCENT, zorder=3)

    for bar in bars:
        w = bar.get_width()
        ax.annotate(f"{w:.1f}%",
                    xy=(w, bar.get_y() + bar.get_height() / 2),
                    xytext=(5, 0), textcoords="offset points",
                    ha="left", va="center", fontsize=8, color=COLOR_PRIMARY, fontweight="bold")

    ax.set_xlim(0, 115)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=8, color=COLOR_PRIMARY)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(COLOR_MUTED)
    ax.spines['bottom'].set_color(COLOR_MUTED)
    ax.grid(axis='x', linestyle=':', alpha=0.6, zorder=0)
    ax.set_xlabel("Progresso Ponderado (%)", fontsize=8, color=COLOR_PRIMARY)
    ax.tick_params(colors=COLOR_PRIMARY, labelsize=8)
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=200)
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()

def chart_six_weeks_evolution(weekly_data: List[Dict[str, Any]], weekly_goal: float = 10.0) -> bytes:
    """Gráfico de linha: evolução das últimas 6 semanas vs. meta semanal"""
    fig, ax = plt.subplots(figsize=(6, 2.5), dpi=200)
    fig.patch.set_facecolor(COLOR_BG)
    ax.set_facecolor(COLOR_BG)

    data = weekly_data[:6] if len(weekly_data) >= 6 else weekly_data
    sorted_data = list(reversed(data))

    labels = [str(w.get("semana_inicio", w.get("semana", "")))[-5:] for w in sorted_data]
    hours = [float(w.get("horas_reais", w.get("horas", 0.0)) or 0.0) for w in sorted_data]

    if not labels:
        labels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"]
        hours = [0.0] * 6

    ax.plot(labels, hours, marker='o', color=COLOR_PRIMARY, linewidth=2, label="Horas Estudadas", zorder=4)
    ax.axhline(weekly_goal, color=COLOR_ACCENT, linestyle="--", linewidth=1.5, label=f"Meta ({weekly_goal:.0f}h)", zorder=3)

    for i, h in enumerate(hours):
        ax.annotate(f"{h:.1f}h", xy=(labels[i], h), xytext=(0, 5), textcoords="offset points",
                    ha="center", fontsize=8, color=COLOR_PRIMARY, fontweight="bold")

    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(COLOR_MUTED)
    ax.spines['bottom'].set_color(COLOR_MUTED)
    ax.grid(True, linestyle=':', alpha=0.6, zorder=0)
    ax.set_ylabel("Horas", fontsize=8, color=COLOR_PRIMARY)
    ax.tick_params(colors=COLOR_PRIMARY, labelsize=8)
    ax.legend(loc="upper left", frameon=False, fontsize=8)
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=200)
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()

def chart_distribution_donut(disciplines: List[Dict[str, Any]]) -> bytes:
    """Gráfico de rosca: distribuição de horas reais por disciplina"""
    fig, ax = plt.subplots(figsize=(4.5, 3.0), dpi=200)
    fig.patch.set_facecolor(COLOR_BG)

    def get_hours(d):
        return float(d.get("horas_reais_total", d.get("horas", d.get("horas_reais", 0.0))) or 0.0)

    def get_name(d):
        return d.get("nome", d.get("disciplina", "Matéria"))

    active_discs = [d for d in disciplines if get_hours(d) > 0]
    if not active_discs:
        labels = ["Sem registro"]
        sizes = [1]
        colors = [COLOR_MUTED]
    else:
        labels = [get_name(d)[:18] for d in active_discs]
        sizes = [get_hours(d) for d in active_discs]
        colors = ["#2C2E4C", "#C8B755", "#4A4D70", "#9A8C35", "#6B6019"][:len(sizes)]

    wedges, texts, autotexts = ax.pie(
        sizes, labels=labels, autopct='%1.0f%%', startangle=90,
        colors=colors, pctdistance=0.75,
        textprops={'fontsize': 7, 'color': COLOR_PRIMARY},
        wedgeprops=dict(width=0.4, edgecolor='w')
    )

    for at in autotexts:
        at.set_color('white')
        at.set_fontsize(7)
        at.set_weight('bold')

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=200)
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()
