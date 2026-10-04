// ============================================================================
// EduTrack AI v2 - frontend/src/components/WeeklyReportModal.jsx
// Modal de Geração e Download de Relatório Semanal em PDF (Seção 7)
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, CheckCircle, AlertTriangle, Loader2, X, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function WeeklyReportModal({ isOpen, onClose }) {
  const [selectedWeek, setSelectedWeek] = useState('current'); // 'current' | 'previous'
  const [status, setStatus] = useState('idle'); // 'idle' | 'generating' | 'ready' | 'error'
  const [jobId, setJobId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setJobId(null);
      setErrorMessage('');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [isOpen]);

  // Polling do status do Job (Seção 7.1)
  const pollJobStatus = (id) => {
    let attempts = 0;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const data = await api.getReportJobStatus(id);
        if (data.status === 'pronto') {
          clearInterval(pollIntervalRef.current);
          setStatus('ready');
        } else if (data.status === 'erro') {
          clearInterval(pollIntervalRef.current);
          setStatus('error');
          setErrorMessage(data.mensagem_erro || data.error || 'Falha na compilação do relatório.');
        } else if (attempts >= 30) {
          // Timeout de 60 segundos (30 x 2s)
          clearInterval(pollIntervalRef.current);
          setStatus('error');
          setErrorMessage('Tempo limite atingido ao gerar o relatório. Tente novamente.');
        }
      } catch (err) {
        clearInterval(pollIntervalRef.current);
        setStatus('error');
        setErrorMessage(err.message || 'Erro ao consultar o status do relatório.');
      }
    }, 2000);
  };

  const handleGenerate = async () => {
    setStatus('generating');
    setErrorMessage('');

    // Calcula data de início da semana
    let semanaInicio = undefined;
    if (selectedWeek === 'previous') {
      const d = new Date();
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const prevMonday = new Date(d.setDate(diffToMonday - 7));
      semanaInicio = prevMonday.toISOString().split('T')[0];
    }

    try {
      const res = await api.requestWeeklyReport(semanaInicio);
      if (res && res.id_job) {
        setJobId(res.id_job);
        pollJobStatus(res.id_job);
      } else {
        throw new Error('Identificador de job não retornado pelo servidor.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Erro ao solicitar geração do relatório.');
    }
  };

  const handleDownload = async () => {
    if (!jobId) return;
    try {
      const blob = await api.downloadReportPdf(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edutrack-relatorio-semanal-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message || 'Erro ao baixar arquivo PDF.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white dark:bg-brand-dark-surface rounded-2xl shadow-2xl border border-brand-light dark:border-brand-dark-card overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-brand-dark text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-brand-gold shrink-0" />
            <h2 id="report-modal-title" className="text-base font-bold">
              Relatório Semanal em PDF
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark leading-relaxed">
            Gera um documento consolidado em PDF diagramado com Capa, KPIs de dedicação, gráficos estatísticos em alta resolução, progresso ponderado por matéria e recomendações de IA.
          </p>

          {status === 'idle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1.5">
                  Período da Semana
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWeek('current')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      selectedWeek === 'current'
                        ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-text-light dark:text-brand-gold shadow-sm'
                        : 'border-brand-light-hover dark:border-brand-dark-card text-brand-dark dark:text-white hover:bg-brand-light/50 dark:hover:bg-brand-dark'
                    }`}
                  >
                    Semana Atual
                    <span className="block text-[11px] font-normal text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-0.5">
                      Segunda até hoje
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedWeek('previous')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      selectedWeek === 'previous'
                        ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-text-light dark:text-brand-gold shadow-sm'
                        : 'border-brand-light-hover dark:border-brand-dark-card text-brand-dark dark:text-white hover:bg-brand-light/50 dark:hover:bg-brand-dark'
                    }`}
                  >
                    Semana Anterior
                    <span className="block text-[11px] font-normal text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-0.5">
                      Segunda a Domingo
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  className="w-full min-h-[44px] bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold text-sm rounded-xl shadow transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Gerar Relatório (PDF)
                </button>
              </div>
            </div>
          )}

          {status === 'generating' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
              <div>
                <p className="text-sm font-bold text-brand-dark dark:text-white">
                  Compilando seu relatório semanal...
                </p>
                <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-1">
                  Gerando gráficos estatísticos e formatando o documento ReportLab.
                </p>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-dark dark:text-white">
                  Relatório gerado com sucesso!
                </p>
                <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-1">
                  O documento em PDF está pronto para download.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar Arquivo PDF
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                Não foi possível gerar o relatório
              </p>
              <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                {errorMessage}
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="px-4 py-2 bg-brand-light dark:bg-brand-dark text-brand-dark dark:text-white text-xs font-semibold rounded-xl hover:bg-brand-light-hover"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
