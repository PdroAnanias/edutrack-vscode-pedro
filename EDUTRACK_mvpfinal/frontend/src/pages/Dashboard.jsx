import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Calendar,
  ArrowRight,
  Info,
  Lightbulb,
  Check
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { api } from '../services/api';

export default function Dashboard({ onNavigateDiscipline }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setData(res);
    } catch (err) {
      setError('Não foi possível carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-brand-dark/70 font-medium">Processando estatísticas e insights com IA...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
          <p>{error || 'Erro ao carregar painel.'}</p>
          <button
            onClick={loadStats}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const { summary, disciplines, charts, insights, upcomingTasks } = data;

  // Colors for charts
  const BAR_COLORS = ['#2C2E4C', '#C8B755', '#4A4E7A', '#8F8236', '#3D4166'];
  const PIE_COLORS = ['#C8B755', '#2C2E4C'];

  const completionPieData = [
    { name: 'Concluídas', value: summary.completedTasks },
    { name: 'Pendentes', value: summary.pendingTasks },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto space-y-8">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark tracking-tight">
            Menu Principal & Dashboard
          </h1>
          <p className="text-brand-dark/70 text-sm mt-1">
            Acompanhamento em tempo real do seu progresso em todas as disciplinas ativas.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-brand-dark text-brand-light px-4 py-2 rounded-xl text-xs font-medium border border-brand-gold/30 shadow-sm self-start">
          <Sparkles className="w-4 h-4 text-brand-gold" />
          <span>Motor de Insights AI Ativo</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Disciplinas */}
        <div className="bg-white rounded-2xl p-5 border border-brand-dark/10 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark/60">
              Disciplinas
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand-dark/5 text-brand-dark flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-brand-dark mt-2">{summary.totalDisciplines}</p>
          <span className="text-xs text-brand-dark/60 mt-1 block">
            {summary.totalCourseHours} horas curriculares totais
          </span>
        </div>

        {/* Tarefas Pendentes */}
        <div className="bg-white rounded-2xl p-5 border border-brand-dark/10 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark/60">
              Tarefas Pendentes
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-2">{summary.pendingTasks}</p>
          <span className="text-xs text-brand-dark/60 mt-1 block">
            Exigem sua atenção no período
          </span>
        </div>

        {/* Tarefas Concluídas */}
        <div className="bg-white rounded-2xl p-5 border border-brand-dark/10 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark/60">
              Concluídas
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-700 mt-2">{summary.completedTasks}</p>
          <span className="text-xs text-brand-dark/60 mt-1 block">
            {summary.overallProgress}% do total de tarefas
          </span>
        </div>

        {/* Tempo de Estudo */}
        <div className="bg-white rounded-2xl p-5 border border-brand-dark/10 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark/60">
              Tempo Registrado
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-dark flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-brand-dark mt-2">{summary.totalHoursSpent}h</p>
          <span className="text-xs text-brand-dark/60 mt-1 block">
            Dedicação de estudos nas matérias
          </span>
        </div>
      </div>

      {/* AI INSIGHTS SECTION */}
      <div className="bg-gradient-to-br from-brand-dark to-[#1d1f35] text-brand-light rounded-3xl p-6 md:p-8 shadow-xl border border-brand-gold/20">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-light/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gold text-brand-dark flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-light flex items-center gap-2">
                Insights Inteligentes EduTrack AI
              </h2>
              <p className="text-xs text-brand-light/60">
                Análise preditiva baseada em seus prazos, taxa de conclusão e dedicação
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs bg-brand-gold/15 text-brand-gold border border-brand-gold/30 px-3 py-1 rounded-full font-medium">
            {insights.length} Recomendações
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight) => {
            const isAlert = insight.type === 'warning' || insight.type === 'alert';
            return (
              <div
                key={insight.id}
                className="bg-brand-light/5 hover:bg-brand-light/10 transition rounded-2xl p-5 border border-brand-light/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isAlert
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                      }`}
                    >
                      {insight.category}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-brand-light mb-1.5">
                    {insight.title}
                  </h3>
                  <p className="text-xs text-brand-light/70 leading-relaxed">
                    {insight.message}
                  </p>
                </div>

                {insight.actionableTip && (
                  <div className="mt-4 pt-3 border-t border-brand-light/10 flex items-start gap-2 bg-brand-light/5 p-2.5 rounded-xl">
                    <Lightbulb className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                    <p className="text-[11px] text-brand-gold font-medium">
                      {insight.actionableTip}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Tempo Gasto por Disciplina */}
        <div className="bg-white rounded-3xl p-6 border border-brand-dark/10 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-brand-dark text-lg">
                Horas Dedicadas por Disciplina
              </h3>
              <p className="text-xs text-brand-dark/60">
                Tempo registrado de estudo e execução de tarefas
              </p>
            </div>
            <Clock className="w-5 h-5 text-brand-gold" />
          </div>

          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.timePerDiscipline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#2C2E4C' }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#2C2E4C' }} />
                <Tooltip
                  formatter={(val) => [`${val} horas`, 'Tempo Gasto']}
                  labelFormatter={(label) => `Disciplina: ${label}`}
                  contentStyle={{ backgroundColor: '#2C2E4C', borderColor: '#C8B755', borderRadius: '12px', color: '#E7ECEF' }}
                />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                  {charts.timePerDiscipline.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribuição de Tarefas & Ritmo */}
        <div className="bg-white rounded-3xl p-6 border border-brand-dark/10 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-brand-dark text-lg">
                Distribuição Geral de Tarefas
              </h3>
              <p className="text-xs text-brand-dark/60">
                Comparativo entre atividades finalizadas e pendências
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-brand-gold" />
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {completionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#2C2E4C', borderColor: '#C8B755', borderRadius: '12px', color: '#E7ECEF' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3 pr-6">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-brand-gold"></div>
                <span className="text-xs font-semibold text-brand-dark">Concluídas ({summary.completedTasks})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-brand-dark"></div>
                <span className="text-xs font-semibold text-brand-dark">Pendentes ({summary.pendingTasks})</span>
              </div>
              <div className="text-xs text-brand-dark/60 pt-2 border-t border-brand-dark/10">
                Taxa de conclusão: <strong>{summary.overallProgress}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DISCIPLINAS LIST & PROGRESS SECTION */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-brand-dark/10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-brand-dark text-xl">
              Progresso Detalhado por Disciplina
            </h3>
            <p className="text-xs text-brand-dark/60">
              Percentual calculado proporcionalmente pelas tarefas concluídas
            </p>
          </div>
          <button
            onClick={() => onNavigateDiscipline && onNavigateDiscipline()}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-dark hover:text-brand-gold transition group"
          >
            Gerenciar Disciplinas
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-brand-gold" />
          </button>
        </div>

        <div className="space-y-4">
          {disciplines.map((d) => (
            <div
              key={d.id}
              className="p-4 rounded-2xl bg-brand-light/30 border border-brand-dark/5 hover:border-brand-gold/40 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="font-bold text-brand-dark text-base">{d.name}</span>
                  <span className="text-xs text-brand-dark/60 ml-2">
                    Prof. {d.teacher} • {d.hours}h totais
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-brand-dark/70">
                    {d.completed_tasks} de {d.total_tasks} tarefas
                  </span>
                  <span className="text-sm font-bold text-brand-dark min-w-[45px] text-right">
                    {d.progress_percent}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-brand-dark/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-brand-gold"
                  style={{ width: `${d.progress_percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
