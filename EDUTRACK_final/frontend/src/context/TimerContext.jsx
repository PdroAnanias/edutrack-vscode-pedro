// ============================================================================
// EduTrack AI v2 - frontend/src/context/TimerContext.jsx
// Gerenciamento Global do Cronômetro de Estudo em Tempo Real (Seção 3)
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [warningMessage, setWarningMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerIntervalRef = useRef(null);

  // Carrega a sessão ativa ao montar ou após autenticação
  const refreshActiveSession = useCallback(async () => {
    try {
      const res = await api.getActiveSession();
      const raw = res?.sessao || res?.sessao_ativa || (res?.ativa ? res.sessao : null);
      if (raw && (raw.id_sessao || raw.id)) {
        const id = raw.id_sessao || raw.id;
        const id_tarefa = raw.id_tarefa;
        const titulo_tarefa = raw.tarefa_titulo || raw.titulo_tarefa || raw.titulo || 'Tarefa em andamento';
        const nome_disciplina = raw.nome_disciplina || '';
        const iniciado_em = raw.inicio || raw.iniciado_em;
        const startTime = new Date(iniciado_em).getTime();
        const now = Date.now();
        const diffInSeconds = Math.max(0, Math.floor((now - startTime) / 1000));

        const normalizedSession = {
          ...raw,
          id,
          id_sessao: id,
          id_tarefa,
          titulo_tarefa,
          tarefa_titulo: titulo_tarefa,
          nome_disciplina,
          iniciado_em,
          inicio: iniciado_em,
          tipo_registro: raw.origem || 'cronometro'
        };

        setActiveSession(normalizedSession);
        setElapsedSeconds(diffInSeconds);

        if (diffInSeconds >= 12 * 3600) {
          setWarningMessage('Parece que você esqueceu o cronômetro ligado por mais de 12 horas. Deseja pausá-lo e ajustar o tempo?');
        } else {
          setWarningMessage(null);
        }
      } else {
        setActiveSession(null);
        setElapsedSeconds(0);
        setWarningMessage(null);
      }
    } catch (err) {
      // Ignora erro de autenticação se não estiver logado
      if (err?.status !== 401 && err?.response?.status !== 401) {
        console.error('Erro ao verificar sessão ativa:', err);
      }
      setActiveSession(null);
      setElapsedSeconds(0);
    }
  }, []);

  // Intervalo de contagem a cada segundo
  useEffect(() => {
    if (activeSession) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next === 12 * 3600) {
            setWarningMessage('Atenção: sua sessão ultrapassou 12 horas contínuas.');
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setElapsedSeconds(0);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeSession]);

  // Iniciar Cronômetro
  const startTimer = async (taskId, taskInfo = {}) => {
    setLoading(true);
    const previousSession = activeSession;
    const now = new Date();

    // Atualização otimista
    const tempId = 'temp-' + Date.now();
    const titulo = taskInfo.titulo || taskInfo.title || 'Tarefa em andamento';
    const disciplina = taskInfo.nome_disciplina || taskInfo.discipline_name || '';

    setActiveSession({
      id: tempId,
      id_sessao: tempId,
      id_tarefa: taskId,
      titulo_tarefa: titulo,
      tarefa_titulo: titulo,
      nome_disciplina: disciplina,
      iniciado_em: now.toISOString(),
      inicio: now.toISOString(),
      tipo_registro: 'cronometro'
    });
    setElapsedSeconds(0);

    try {
      const res = await api.startSession(taskId);
      const raw = res?.sessao || res?.sessao_ativa;
      if (raw && (raw.id_sessao || raw.id)) {
        const id = raw.id_sessao || raw.id;
        const iniciado_em = raw.inicio || raw.iniciado_em || now.toISOString();
        const normalized = {
          ...raw,
          id,
          id_sessao: id,
          id_tarefa: raw.id_tarefa || taskId,
          titulo_tarefa: raw.tarefa_titulo || raw.titulo_tarefa || titulo,
          tarefa_titulo: raw.tarefa_titulo || raw.titulo_tarefa || titulo,
          nome_disciplina: raw.nome_disciplina || disciplina,
          iniciado_em,
          inicio: iniciado_em,
        };
        setActiveSession(normalized);
        const startTime = new Date(iniciado_em).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      } else {
        await refreshActiveSession();
      }
      window.dispatchEvent(new CustomEvent('edutrack:timer-changed', { detail: { action: 'start', taskId } }));
      return true;
    } catch (err) {
      console.error('Falha ao iniciar cronômetro:', err);
      // Reverte estado anterior em caso de erro
      setActiveSession(previousSession);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Pausar Cronômetro
  const pauseTimer = async () => {
    if (!activeSession) return null;
    setLoading(true);

    const sessionId = activeSession.id || activeSession.id_sessao;
    const previousSession = activeSession;
    const previousSeconds = elapsedSeconds;

    // Pausa otimista
    setActiveSession(null);
    setElapsedSeconds(0);
    setWarningMessage(null);

    try {
      let targetId = sessionId;
      if (typeof targetId === 'string' && targetId.startsWith('temp-')) {
        const activeRes = await api.getActiveSession();
        const real = activeRes?.sessao || activeRes?.sessao_ativa;
        if (real && (real.id_sessao || real.id)) {
          targetId = real.id_sessao || real.id;
        }
      }

      const res = await api.pauseSession(targetId);
      window.dispatchEvent(new CustomEvent('edutrack:timer-changed', { detail: { action: 'pause', sessionId: targetId } }));
      return res;
    } catch (err) {
      console.error('Falha ao pausar cronômetro:', err);
      // Reverte em caso de erro
      setActiveSession(previousSession);
      setElapsedSeconds(previousSeconds);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const dismissWarning = () => {
    setWarningMessage(null);
  };

  // Formatação HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <TimerContext.Provider
      value={{
        activeSession,
        elapsedSeconds,
        formattedTime: formatTime(elapsedSeconds),
        loading,
        warningMessage,
        dismissWarning,
        startTimer,
        pauseTimer,
        refreshActiveSession,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer deve ser usado dentro de um TimerProvider');
  }
  return context;
}
