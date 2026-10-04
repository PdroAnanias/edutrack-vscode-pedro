// ============================================================================
// EduTrack AI v2 - frontend/src/components/ActiveTimerWidget.jsx
// Widget de Sessão de Estudo em Andamento (Desktop e Mobile)
// ============================================================================

import React from 'react';
import { useTimer } from '../context/TimerContext';
import { Play, Pause, Clock, AlertTriangle, X } from 'lucide-react';

export default function ActiveTimerWidget({ isMobile = false }) {
  const { 
    activeSession, 
    formattedTime, 
    loading, 
    pauseTimer, 
    warningMessage, 
    dismissWarning 
  } = useTimer();

  if (!activeSession) return null;

  return (
    <div className={`transition-all duration-200 ${
      isMobile 
        ? 'w-full px-4 py-2 bg-brand-dark/95 dark:bg-brand-dark-surface/95 text-white backdrop-blur border-t border-brand-gold/30 shadow-lg' 
        : 'p-3 bg-brand-dark-surface dark:bg-brand-dark rounded-xl border border-brand-gold/30 text-white shadow-md my-2'
    }`}>
      {/* Alerta de esquecimento (>12h) */}
      {warningMessage && (
        <div className="mb-2 p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-tight">{warningMessage}</div>
          <button 
            onClick={dismissWarning} 
            className="text-amber-300 hover:text-white p-0.5"
            aria-label="Dispensar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-brand-gold/20 text-brand-gold shrink-0">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-brand-dark"></span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-brand-gold font-medium truncate">
              {activeSession.nome_disciplina || 'Sessão em foco'}
            </p>
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {activeSession.titulo_tarefa || 'Estudo em andamento'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span 
            className="font-mono text-sm sm:text-base font-bold text-white bg-black/30 px-2 py-0.5 rounded border border-white/10"
            aria-live="polite"
          >
            {formattedTime}
          </span>
          <button
            onClick={pauseTimer}
            disabled={loading}
            aria-label="Pausar cronômetro"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold shadow transition-all active:scale-95 disabled:opacity-50"
            title="Pausar e salvar tempo"
          >
            <Pause className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
