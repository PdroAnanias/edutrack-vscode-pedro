// ============================================================================
// EduTrack AI v2 - frontend/src/components/GlobalSearchModal.jsx
// Modal de Busca Global (Ctrl+K) com Agrupamento de Disciplinas e Tarefas (Seção 6.2)
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, CheckSquare, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function GlobalSearchModal({ isOpen, onClose, onSelectDiscipline, onSelectTask }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ disciplinas: [], tarefas: [] });
  const inputRef = useRef(null);

  // Foco automático ao abrir e fechar com Esc
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchTerm('');
      setResults({ disciplinas: [], tarefas: [] });
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounce de busca de 300ms
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults({ disciplinas: [], tarefas: [] });
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.globalSearch(searchTerm.trim());
        setResults({
          disciplinas: data.disciplinas || [],
          tarefas: data.tarefas || [],
        });
      } catch (err) {
        console.error('Erro na busca global:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  if (!isOpen) return null;

  const totalResults = results.disciplinas.length + results.tarefas.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-brand-dark/70 dark:bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-brand-dark-surface rounded-2xl shadow-2xl border border-brand-light/30 dark:border-brand-dark-card overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Busca global de disciplinas e tarefas"
      >
        {/* Barra de Entrada */}
        <div className="flex items-center px-4 py-3.5 border-b border-brand-light dark:border-brand-dark-card gap-3">
          <Search className="w-5 h-5 text-brand-dark/50 dark:text-brand-text-secondary-dark" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquise por matérias, tarefas ou lembretes..."
            className="flex-1 bg-transparent border-0 text-brand-dark dark:text-white placeholder-brand-dark/40 dark:placeholder-brand-text-secondary-dark text-base focus:ring-0 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-brand-gold animate-spin" />}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-brand-dark/40 dark:text-brand-text-secondary-dark hover:text-brand-dark dark:hover:text-white"
              aria-label="Limpar termo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono font-medium text-brand-dark/50 dark:text-brand-text-secondary-dark bg-brand-light dark:bg-brand-dark rounded border border-brand-dark/10 dark:border-white/10">
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div className="overflow-y-auto p-4 space-y-5 flex-1">
          {searchTerm.trim() === '' ? (
            <div className="py-8 text-center text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-sm">
              Digite pelo menos 1 caractere para buscar no EduTrack AI.
            </div>
          ) : totalResults === 0 && !loading ? (
            <div className="py-8 text-center text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-sm">
              Nenhuma disciplina ou tarefa encontrada para "{searchTerm}".
            </div>
          ) : (
            <>
              {/* Disciplinas */}
              {results.disciplinas.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary-light dark:text-brand-text-secondary-dark mb-2 px-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-gold" />
                    Disciplinas ({results.disciplinas.length})
                  </h3>
                  <div className="space-y-1">
                    {results.disciplinas.map((disc) => (
                      <button
                        key={`disc-${disc.id}`}
                        onClick={() => {
                          onSelectDiscipline(disc);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-brand-light dark:hover:bg-brand-dark text-left transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-brand-dark dark:text-white group-hover:text-brand-gold truncate">
                            {disc.nome}
                          </p>
                          <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark truncate">
                            {disc.professor ? `Prof. ${disc.professor}` : 'Sem professor'} • {disc.carga_horaria}h
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-brand-dark/30 dark:text-brand-text-secondary-dark group-hover:text-brand-gold group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarefas */}
              {results.tarefas.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary-light dark:text-brand-text-secondary-dark mb-2 px-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-brand-gold" />
                    Tarefas ({results.tarefas.length})
                  </h3>
                  <div className="space-y-1">
                    {results.tarefas.map((task) => (
                      <button
                        key={`task-${task.id}`}
                        onClick={() => {
                          onSelectTask(task);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-brand-light dark:hover:bg-brand-dark text-left transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${task.concluida ? 'bg-emerald-500' : 'bg-brand-gold'}`}></span>
                            <p className="text-sm font-semibold text-brand-dark dark:text-white group-hover:text-brand-gold truncate">
                              {task.titulo}
                            </p>
                          </div>
                          <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark truncate mt-0.5 pl-4">
                            {task.nome_disciplina} {task.data_prevista ? `• Prazo: ${task.data_prevista}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ml-2 ${
                          task.concluida 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                            : 'bg-brand-gold/15 text-brand-gold-text-light dark:text-brand-gold'
                        }`}>
                          {task.concluida ? 'Concluída' : 'Pendente'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé com atalhos */}
        <div className="px-4 py-2.5 bg-brand-light/40 dark:bg-brand-dark/50 border-t border-brand-light dark:border-brand-dark-card flex items-center justify-between text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
          <span>{totalResults} resultado(s) encontrado(s)</span>
          <span>Pressione <b>ESC</b> para sair</span>
        </div>
      </div>
    </div>
  );
}
