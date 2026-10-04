// ============================================================================
// EduTrack AI v2 - frontend/src/components/SessionManualModal.jsx
// Modal de Gestão de Tempo: Sessões Manuais e Histórico de Estudo (Seção 3)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Edit2, AlertCircle, Check, X, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function SessionManualModal({ isOpen, onClose, task, onSessionSaved }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Formulário de adição/edição
  const [mode, setMode] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [formDurationHours, setFormDurationHours] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Carregar sessões da tarefa
  useEffect(() => {
    if (isOpen && task?.id) {
      loadSessions();
    } else {
      setSessions([]);
      setMode('list');
      setError('');
    }
  }, [isOpen, task?.id]);

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTaskSessions(task.id);
      setSessions(data.sessoes || []);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
      setError('Não foi possível carregar as sessões de estudo.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormDurationHours('');
    setFormNotes('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setEditingSessionId(null);
    setMode('list');
    setError('');
  };

  const handleStartAdd = () => {
    resetForm();
    setMode('add');
  };

  const handleStartEdit = (sess) => {
    setEditingSessionId(sess.id);
    const duration = sess.duracao_minutos ? (sess.duracao_minutos / 60).toFixed(2) : '';
    setFormDurationHours(duration);
    setFormNotes(sess.observacoes || '');
    setFormDate(sess.iniciado_em ? sess.iniciado_em.split('T')[0] : new Date().toISOString().split('T')[0]);
    setMode('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const hours = parseFloat(formDurationHours);
    if (isNaN(hours) || hours <= 0) {
      setError('Por favor, informe uma duração em horas maior que zero (ex: 1.5).');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      duracao_minutos: Math.round(hours * 60),
      observacoes: formNotes.trim(),
      iniciado_em: new Date(`${formDate}T12:00:00`).toISOString(),
    };

    try {
      if (mode === 'edit' && editingSessionId) {
        await api.updateSession(editingSessionId, payload);
      } else {
        await api.createManualSession(task.id, payload);
      }

      await loadSessions();
      resetForm();
      if (onSessionSaved) onSessionSaved();
    } catch (err) {
      setError(err.message || 'Erro ao registrar sessão de estudo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Tem certeza que deseja remover este registro de estudo?')) return;
    try {
      await api.deleteSession(sessionId);
      await loadSessions();
      if (onSessionSaved) onSessionSaved();
    } catch (err) {
      alert(err.message || 'Erro ao remover sessão.');
    }
  };

  if (!isOpen || !task) return null;

  // Cálculos de tempo acumulado
  const totalMinutos = sessions.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
  const totalHorasReais = (totalMinutos / 60).toFixed(1);
  const horasEstimadas = task.horas_estimadas ? Number(task.horas_estimadas).toFixed(1) : null;
  const desvioHoras = horasEstimadas ? (totalHorasReais - horasEstimadas).toFixed(1) : null;
  const estourou = desvioHoras && desvioHoras > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-brand-dark-surface rounded-2xl shadow-2xl border border-brand-light dark:border-brand-dark-card overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-modal-title"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-brand-dark text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="w-5 h-5 text-brand-gold shrink-0" />
            <div className="min-w-0">
              <h2 id="session-modal-title" className="text-base font-bold truncate">
                Tempo Dedicado: {task.titulo}
              </h2>
              <p className="text-xs text-brand-gold truncate">
                {task.nome_disciplina || 'Disciplina acadêmica'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo de Tempo: Estimado vs Real */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-brand-light/50 dark:bg-brand-dark/40 border-b border-brand-light dark:border-brand-dark-card text-center">
          <div className="p-2 rounded-xl bg-white dark:bg-brand-dark-surface shadow-sm border border-brand-light dark:border-brand-dark-card">
            <p className="text-[11px] font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark uppercase tracking-wider">
              Estimado
            </p>
            <p className="text-base font-bold text-brand-dark dark:text-white mt-0.5">
              {horasEstimadas ? `${horasEstimadas}h` : '—'}
            </p>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-brand-dark-surface shadow-sm border border-brand-light dark:border-brand-dark-card">
            <p className="text-[11px] font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark uppercase tracking-wider">
              Real Gasto
            </p>
            <p className="text-base font-bold text-brand-dark dark:text-white mt-0.5">
              {totalHorasReais}h
            </p>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-brand-dark-surface shadow-sm border border-brand-light dark:border-brand-dark-card">
            <p className="text-[11px] font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark uppercase tracking-wider">
              Desvio
            </p>
            <p className={`text-base font-bold mt-0.5 ${
              !horasEstimadas ? 'text-brand-text-secondary-light dark:text-brand-text-secondary-dark' :
              estourou ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {horasEstimadas ? `${desvioHoras > 0 ? '+' : ''}${desvioHoras}h` : '—'}
            </p>
          </div>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'list' ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-brand-dark dark:text-white">
                  Histórico de Sessões ({sessions.length})
                </h3>
                <button
                  onClick={handleStartAdd}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark text-xs font-semibold rounded-lg shadow transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar Horas
                </button>
              </div>

              {loading ? (
                <div className="py-8 flex justify-center text-brand-gold">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-sm">
                  Nenhuma sessão de estudo registrada ainda para esta tarefa.
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-xl border border-brand-light dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark/30 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-dark dark:text-white">
                            {(sess.duracao_minutos / 60).toFixed(1)}h
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-brand-light dark:bg-brand-dark text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                            {sess.tipo_registro === 'cronometro' ? 'Cronômetro' : 'Manual'}
                          </span>
                        </div>
                        <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-0.5">
                          {new Date(sess.iniciado_em).toLocaleDateString('pt-BR')} 
                          {sess.observacoes ? ` • "${sess.observacoes}"` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(sess)}
                          className="p-1.5 text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:text-brand-dark dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                          aria-label="Editar registro"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sess.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label="Remover registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <h3 className="text-sm font-bold text-brand-dark dark:text-white">
                {mode === 'edit' ? 'Editar Registro de Estudo' : 'Registrar Estudo Manualmente'}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Duração em Horas (ex: 1.5 para 1h30min) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={formDurationHours}
                  onChange={(e) => setFormDurationHours(e.target.value)}
                  placeholder="Ex: 2.0"
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Data do Estudo *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Anotações / Observações (opcional)
                </label>
                <textarea
                  rows="2"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Leitura do capítulo 3 e exercícios 1 a 5"
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
