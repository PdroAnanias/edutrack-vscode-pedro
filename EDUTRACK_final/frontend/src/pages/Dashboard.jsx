// ============================================================================
// EduTrack AI v2 - frontend/src/pages/Dashboard.jsx
// Painel Principal com Progresso Ponderado, Previsões, Gráficos e Recomendações
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
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
  FileText,
  RotateCw,
  Flame,
  Target,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  ReferenceLine,
  CartesianGrid,
  Cell
} from 'recharts';
import { api } from '../services/api';
import WeeklyReportModal from '../components/WeeklyReportModal';

export default function Dashboard({ onNavigateDiscipline, onNavigateTasks }) {
  const [metrics, setMetrics] = useState(null);
  const [stats, setStats] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [error, setError] = useState('');
  
  // Modal de Relatório Semanal
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Popover de explicação de previsão (sem depender de hover)
  const [activeTooltipDiscipline, setActiveTooltipDiscipline] = useState(null);

  const pollIntervalRef = useRef(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, metricsRes, insightsRes] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getDashboardMetrics(),
        api.getInsights()
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value);
      if (insightsRes.status === 'fulfilled') {
        setInsightsData(insightsRes.value);
        if (insightsRes.value?.status_ia === 'processando') {
          startInsightsPolling();
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err);
      setError('Não foi possível carregar as métricas do painel.');
    } finally {
      setLoading(false);
    }
  };

  const startInsightsPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    let attempts = 0;
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await api.getInsights();
        if (res && res.status_ia === 'pronto') {
          setInsightsData(res);
          clearInterval(pollIntervalRef.current);
        } else if (attempts >= 5) {
          clearInterval(pollIntervalRef.current);
        }
      } catch {
        clearInterval(pollIntervalRef.current);
      }
    }, 3000);
  };

  const handleRefreshInsights = async () => {
    setRefreshingInsights(true);
    try {
      const res = await api.getInsights(true);
      setInsightsData(res);
      if (res?.status_ia === 'processando') {
        startInsightsPolling();
      }
    } catch (err) {
      console.error('Erro ao atualizar insights:', err);
    } finally {
      setRefreshingInsights(false);
    }
  };

  useEffect(() => {
    loadAllData();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 bg-brand-light-hover dark:bg-brand-dark-card rounded-lg w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-brand-dark-surface rounded-2xl shadow-sm animate-pulse p-6 border border-brand-light dark:border-brand-dark-card"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white dark:bg-brand-dark-surface rounded-2xl shadow-sm animate-pulse border border-brand-light dark:border-brand-dark-card"></div>
          <div className="h-72 bg-white dark:bg-brand-dark-surface rounded-2xl shadow-sm animate-pulse border border-brand-light dark:border-brand-dark-card"></div>
        </div>
      </div>
    );
  }

  if (error && !metrics && !stats) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="p-6 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl max-w-md text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={loadAllData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Dados calculados para renderização
  const geral = metrics?.geral || {};
  const progressoPonderado = geral.progresso_geral_ponderado_pct ?? metrics?.progresso_geral_ponderado ?? stats?.summary?.overallProgress ?? 0;
  const progressoSimples = geral.progresso_geral_simples_pct ?? metrics?.progresso_geral_simples ?? stats?.summary?.overallProgress ?? 0;
  const horasSemana = geral.horas_semana_atual ?? metrics?.horas_estudadas_semana ?? 0;
  const metaSemana = geral.meta_semanal_horas ?? metrics?.meta_semanal ?? 15;
  const percMeta = geral.percentual_meta_semanal ?? Math.min(100, Math.round((horasSemana / (metaSemana || 1)) * 100));
  const sequenciaDias = geral.sequencia_dias ?? metrics?.sequencia_dias ?? 0;
  const velocidadeSemanal = geral.velocidade_tarefas_semana ?? metrics?.velocidade_semanal ?? 0;

  // Normalização das disciplinas para a tabela de previsões
  const rawDisciplines = metrics?.disciplinas || stats?.disciplines || [];
  const disciplinesForecast = rawDisciplines.map((d) => ({
    ...d,
    id_disciplina: d.id_disciplina || d.id,
    nome: d.nome || d.name || 'Disciplina',
    progresso_ponderado: d.progresso_ponderado_pct ?? d.progresso_ponderado ?? d.progress_percent ?? 0,
    progresso_simples: d.progresso_simples_pct ?? d.progresso_simples ?? d.progress_percent ?? 0,
    data_fim_prevista: d.data_prevista_conclusao || d.data_fim_prevista || '',
    data_termino: d.data_fim || d.data_termino || '',
    situacao_previsao: d.situacao_previsao || 'no_prazo',
    folga_dias: d.folga_dias,
    confianca_previsao: d.confianca || d.confianca_previsao || 'media',
    explicacao_previsao: d.explicacao_previsao
  }));

  const chartEstimatedReal = metrics?.grafico_estimado_real || (
    disciplinesForecast.length > 0
      ? disciplinesForecast.map(d => ({
          disciplina: d.nome.length > 15 ? d.nome.substring(0, 13) + '...' : d.nome,
          horas_estimadas: Number(d.horas_estimadas_total || 0),
          horas_reais: Number(d.horas_reais_total || d.hours_spent || 0)
        }))
      : (stats?.charts?.timePerDiscipline || []).map(d => ({
          disciplina: d.name,
          horas_estimadas: 0,
          horas_reais: d.hours
        }))
  );

  const chartEvolution = metrics?.grafico_evolucao_semanal || (
    metrics?.evolucao_semanal && metrics.evolucao_semanal.length > 0
      ? [...metrics.evolucao_semanal].reverse().map((w, idx) => ({
          semana: w.semana_inicio ? w.semana_inicio.substring(5) : `Sem ${idx + 1}`,
          horas: Number(w.horas_reais ?? 0),
          meta: Number(w.meta_horas ?? metaSemana)
        }))
      : [
          { semana: 'Semana 1', horas: horasSemana, meta: metaSemana }
        ]
  );

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Botão Relatório */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark dark:text-white tracking-tight">
            Menu Principal & Dashboard
          </h1>
          <p className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-xs sm:text-sm mt-1">
            Métricas preditivas, previsão de conclusão e recomendações inteligentes.
          </p>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark font-bold text-xs sm:text-sm rounded-xl shadow-md hover:bg-brand-dark-surface dark:hover:bg-brand-gold-hover transition-all active:scale-95 self-start sm:self-auto"
        >
          <FileText className="w-4 h-4 text-brand-gold dark:text-brand-dark" />
          <span>Gerar Relatório Semanal (PDF)</span>
        </button>
      </div>

      {/* 1. Cards Principais: Progresso Ponderado, Velocidade/Meta e Contadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Destaque: Progresso Geral Ponderado */}
        <div className="p-5 rounded-2xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
              Progresso Ponderado
            </span>
            <div className="p-2 rounded-xl bg-brand-gold/20 text-brand-gold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-dark dark:text-white font-mono">
                {Math.round(progressoPonderado)}%
              </span>
              <span className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                (simples: {Math.round(progressoSimples)}%)
              </span>
            </div>
            <div className="w-full bg-brand-light dark:bg-brand-dark h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-brand-gold h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progressoPonderado))}%` }}
              ></div>
            </div>
          </div>

          <p className="text-[11px] text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
            Calculado com base na carga horária e peso de cada disciplina.
          </p>
        </div>

        {/* Card: Velocidade e Meta Semanal */}
        <div className="p-5 rounded-2xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
              Meta Semanal
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
              <Target className="w-5 h-5" />
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-brand-dark dark:text-white font-mono">
                {horasSemana}h <span className="text-xs font-normal text-brand-text-secondary-light dark:text-brand-text-secondary-dark">/ {metaSemana}h</span>
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {percMeta}%
              </span>
            </div>
            <div className="w-full bg-brand-light dark:bg-brand-dark h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percMeta}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-brand-text-secondary-light dark:text-brand-text-secondary-dark pt-1 border-t border-brand-light/60 dark:border-brand-dark-card">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> {sequenciaDias} dia(s) seguidos
            </span>
            <span>{velocidadeSemanal} tarefas/sem</span>
          </div>
        </div>

        {/* Card: Tarefas Concluídas vs Pendentes */}
        <div 
          onClick={onNavigateTasks}
          className="p-5 rounded-2xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card shadow-sm flex flex-col justify-between cursor-pointer hover:border-brand-gold/60 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
              Tarefas Ativas
            </span>
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="my-3">
            <span className="text-3xl font-black text-brand-dark dark:text-white font-mono">
              {stats?.summary?.pendingTasks ?? 0}
            </span>
            <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-1">
              {stats?.summary?.completedTasks ?? 0} atividades já concluídas
            </p>
          </div>

          <div className="flex items-center text-xs font-semibold text-brand-gold group-hover:translate-x-1 transition-transform">
            <span>Ver tarefas</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Card: Disciplinas Ativas */}
        <div 
          onClick={onNavigateDiscipline}
          className="p-5 rounded-2xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card shadow-sm flex flex-col justify-between cursor-pointer hover:border-brand-gold/60 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
              Disciplinas
            </span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-500">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="my-3">
            <span className="text-3xl font-black text-brand-dark dark:text-white font-mono">
              {stats?.summary?.totalDisciplines ?? disciplinesForecast.length}
            </span>
            <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-1">
              Matérias cursadas no semestre
            </p>
          </div>

          <div className="flex items-center text-xs font-semibold text-brand-gold group-hover:translate-x-1 transition-transform">
            <span>Gerenciar matérias</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>
      </div>

      {/* 2. Tabela/Cards de Previsão de Conclusão por Disciplina (Seção 4.5) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-light dark:border-brand-dark-card pb-3">
          <div>
            <h2 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-gold" />
              Previsão de Conclusão por Disciplina
            </h2>
            <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-0.5">
              Cálculo estatístico ponderado combinando velocidade de estudo recente e folga até o prazo.
            </p>
          </div>
        </div>

        {disciplinesForecast.length === 0 ? (
          <div className="py-8 text-center text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-sm">
            Nenhuma disciplina cadastrada. Cadastre disciplinas para visualizar a previsão de conclusão.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-light dark:border-brand-dark-card text-xs uppercase font-bold text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                    <th className="py-3 px-3">Disciplina</th>
                    <th className="py-3 px-3">Progresso Ponderado</th>
                    <th className="py-3 px-3">Data Prevista</th>
                    <th className="py-3 px-3">Data Término</th>
                    <th className="py-3 px-3">Folga</th>
                    <th className="py-3 px-3">Situação</th>
                    <th className="py-3 px-3">Confiança</th>
                    <th className="py-3 px-3 text-center">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-light dark:divide-brand-dark-card">
                  {disciplinesForecast.map((d) => {
                    const badgeStyles = {
                      no_prazo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
                      em_risco: 'bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold border-brand-gold/40',
                      critico: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300',
                      sem_dados: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300',
                    }[d.situacao_previsao] || 'bg-gray-100 text-gray-700';

                    const badgeLabels = {
                      no_prazo: 'No Prazo',
                      em_risco: 'Em Risco',
                      critico: 'Atrasada',
                      sem_dados: 'Sem Dados',
                    }[d.situacao_previsao] || d.situacao_previsao;

                    return (
                      <tr key={d.id_disciplina} className="hover:bg-brand-light/30 dark:hover:bg-brand-dark/20 transition">
                        <td className="py-3.5 px-3 font-semibold text-brand-dark dark:text-white">
                          {d.nome}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-brand-light dark:bg-brand-dark h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-brand-gold h-full rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, d.progresso_ponderado))}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-xs font-bold text-brand-dark dark:text-white">
                              {Math.round(d.progresso_ponderado)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs text-brand-dark dark:text-brand-light">
                          {d.data_fim_prevista || '—'}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                          {d.data_termino || '—'}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs">
                          {d.folga_dias !== null && d.folga_dias !== undefined ? (
                            <span className={d.folga_dias < 0 ? 'text-red-500 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                              {d.folga_dias > 0 ? `+${d.folga_dias}d` : `${d.folga_dias}d`}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg border ${badgeStyles}`}>
                            {badgeLabels}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-xs capitalize text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                          {d.confianca_previsao || 'baixa'}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => setActiveTooltipDiscipline(d)}
                            className="p-1 text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:text-brand-gold rounded-lg hover:bg-brand-light dark:hover:bg-brand-dark"
                            aria-label={`Ver explicação do cálculo de ${d.nome}`}
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (< 768px) */}
            <div className="md:hidden space-y-3">
              {disciplinesForecast.map((d) => (
                <div
                  key={`m-${d.id_disciplina}`}
                  className="p-4 rounded-xl border border-brand-light dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-brand-dark dark:text-white">{d.nome}</h3>
                      <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                        Término: {d.data_termino || '—'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold">
                      {d.situacao_previsao}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark">Progresso Ponderado</span>
                      <span className="font-mono font-bold text-brand-dark dark:text-white">{Math.round(d.progresso_ponderado)}%</span>
                    </div>
                    <div className="w-full bg-brand-light dark:bg-brand-dark h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-gold h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, d.progresso_ponderado))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-brand-light dark:border-brand-dark-card">
                    <span className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                      Previsão: <b>{d.data_fim_prevista || '—'}</b>
                    </span>
                    <button
                      onClick={() => setActiveTooltipDiscipline(d)}
                      className="text-brand-gold font-bold flex items-center gap-1 p-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Como foi calculado?
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Popover Explicativo de Previsão */}
      {activeTooltipDiscipline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-brand-dark-surface rounded-2xl max-w-sm w-full p-5 border border-brand-light dark:border-brand-dark-card shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-gold" />
                Cálculo: {activeTooltipDiscipline.nome}
              </h3>
              <button
                onClick={() => setActiveTooltipDiscipline(null)}
                className="p-1 text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:text-brand-dark dark:hover:text-white"
                aria-label="Fechar explicação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark leading-relaxed">
              {activeTooltipDiscipline.explicacao_previsao ||
                `A previsão estima o término em ${activeTooltipDiscipline.data_fim_prevista || 'data futura'} baseando-se na velocidade de conclusão de tarefas das últimas 4 semanas (pesos 4, 3, 2 e 1) e na folga de ${activeTooltipDiscipline.folga_dias ?? 0} dias.`}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveTooltipDiscipline(null)}
                className="px-3 py-1.5 bg-brand-gold text-brand-dark font-bold text-xs rounded-lg"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Gráficos: Estimado vs Real e Evolução Semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estimado vs Real por Disciplina */}
        <div className="p-6 rounded-2xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-brand-dark dark:text-white">
              Horas de Estudo: Estimado vs. Real
            </h2>
            <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
              Comparativo de horas planejadas contra horas reais registradas por disciplina.
            </p>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartEstimatedReal} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis 
                  dataKey="disciplina" 
                  tick={{ fontSize: 11, fill: 'currentColor' }} 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    fontSize: '12px',
                    backgroundColor: '#2C2E4C', 
                    color: '#fff',
                    border: '1px solid #C8B755' 
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="horas_estimadas" name="Estimado (h)" fill="#C8B755" radius={[4, 4, 0, 0]} />
                <Bar dataKey="horas_reais" name="Real Gasto (h)" fill="#2C2E4C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução Semanal de Estudo */}
        <div className="p-6 rounded-2xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-brand-dark dark:text-white">
              Evolução Semanal de Horas
            </h2>
            <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
              Horas estudadas nas semanas recentes com a meta semanal delimitada.
            </p>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartEvolution} margin={{ top: 10, right: 15, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: 'currentColor' }} />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    fontSize: '12px',
                    backgroundColor: '#2C2E4C', 
                    color: '#fff',
                    border: '1px solid #C8B755' 
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <ReferenceLine 
                  y={metaSemana} 
                  stroke="#C8B755" 
                  strokeDasharray="4 4" 
                  label={{ value: `Meta: ${metaSemana}h`, fill: '#C8B755', fontSize: 11, position: 'top' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="horas" 
                  name="Horas Reais" 
                  stroke="#2C2E4C" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#2C2E4C' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Bloco de Recomendações e Insights com IA (Seção 5.7) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-light dark:border-brand-dark-card pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-gold" />
            <div>
              <h2 className="text-base font-bold text-brand-dark dark:text-white">
                Recomendações e Insights Acadêmicos
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  insightsData?.fonte === 'ia' 
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' 
                    : 'bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold'
                }`}>
                  {insightsData?.fonte === 'ia' ? 'Enriquecido com Gemini' : 'Gerado por Regras'}
                </span>
                {insightsData?.status_ia === 'processando' && (
                  <span className="text-[11px] text-brand-gold flex items-center gap-1 animate-pulse">
                    <RotateCw className="w-3 h-3 animate-spin" /> IA refinando sugestões...
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleRefreshInsights}
            disabled={refreshingInsights}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-light dark:bg-brand-dark hover:bg-brand-light-hover dark:hover:bg-brand-dark-card text-brand-dark dark:text-white rounded-xl text-xs font-semibold transition active:scale-95 self-start sm:self-auto disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshingInsights ? 'animate-spin' : ''}`} />
            <span>Atualizar Insights</span>
          </button>
        </div>

        {(!insightsData?.insights || insightsData.insights.length === 0) ? (
          <div className="py-8 text-center text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-sm">
            Registre o tempo das suas tarefas para receber recomendações e diagnósticos acadêmicos personalizados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insightsData.insights.map((item, idx) => {
              const severityBorder = {
                critical: 'border-l-4 border-l-red-500',
                alta: 'border-l-4 border-l-red-500',
                warning: 'border-l-4 border-l-brand-gold',
                media: 'border-l-4 border-l-brand-gold',
                info: 'border-l-4 border-l-blue-500',
                baixa: 'border-l-4 border-l-blue-500',
                success: 'border-l-4 border-l-emerald-500'
              }[item.severidade] || 'border-l-4 border-l-brand-gold';

              const getActionLabel = () => {
                if (!item.acao_sugerida) return null;
                if (typeof item.acao_sugerida === 'string') return item.acao_sugerida;
                if (typeof item.acao_sugerida === 'object') {
                  const t = item.acao_sugerida.tipo;
                  if (t === 'abrir_disciplina') return 'Ver disciplina';
                  if (t === 'abrir_tarefas') return 'Ver tarefas';
                  if (t === 'abrir_dashboard') return 'Ver metas';
                  return 'Ver detalhes';
                }
                return 'Ver mais';
              };

              const actionLabel = getActionLabel();

              const handleActionClick = () => {
                if (typeof item.acao_sugerida === 'object') {
                  const t = item.acao_sugerida.tipo;
                  if (t === 'abrir_disciplina') {
                    onNavigateDiscipline();
                    return;
                  }
                  if (t === 'abrir_tarefas') {
                    onNavigateTasks();
                    return;
                  }
                }
                if (item.rota_acao === 'disciplinas' || item.rota_acao?.includes('disciplinas')) {
                  onNavigateDiscipline();
                } else {
                  onNavigateTasks();
                }
              };

              return (
                <div
                  key={item.id || idx}
                  className={`p-4 rounded-xl border border-brand-light dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark/20 flex flex-col justify-between space-y-3 ${severityBorder}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                        {item.tipo || item.codigo || 'Dica'}
                      </span>
                      <span className="text-[10px] text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                        {item.fonte === 'ia' ? 'Gemini' : 'Regra'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-brand-dark dark:text-white leading-snug">
                      {item.titulo}
                    </h3>
                    <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark leading-relaxed">
                      {item.texto}
                    </p>
                  </div>

                  {actionLabel && (
                    <button
                      onClick={handleActionClick}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-gold hover:text-brand-gold-hover self-start pt-1"
                    >
                      <span>{actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Relatório Semanal em PDF */}
      <WeeklyReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
