// ============================================================================
// EduTrack AI v2 - frontend/src/pages/Disciplines.jsx
// Gestão de Disciplinas Acadêmicas, Busca, Filtros, Cronômetro e Tarefas
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Bell,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  StickyNote,
  X,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Filter,
  Search,
  Play,
  Pause,
  History,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useTimer } from '../context/TimerContext';
import SessionManualModal from '../components/SessionManualModal';

export default function Disciplines() {
  const { activeSession, startTimer, pauseTimer } = useTimer();

  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Busca e Filtros na página de Disciplinas (Seção 6.2)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'pending', 'at_risk', 'finished'

  // Modais de Disciplina
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState(null);

  // Form Disciplina
  const [disciplineForm, setDisciplineForm] = useState({
    name: '',
    teacher: '',
    hours: 60,
    description: '',
    start_date: '',
    end_date: ''
  });

  // Tarefas da Disciplina selecionada
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'Pendente',
    notes: '',
    hours_spent: 1
  });
  const [editingNoteTaskId, setEditingNoteTaskId] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Modal de Sessões Manuais
  const [sessionModalTask, setSessionModalTask] = useState(null);

  const loadDisciplines = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getDisciplines();
      setDisciplines(data || []);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar disciplinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisciplines();
  }, []);

  const fetchDisciplineTasks = async (disciplineId) => {
    setLoadingTasks(true);
    try {
      const res = await api.getTasks({ disciplinas: disciplineId });
      const list = Array.isArray(res) ? res : res.itens || [];
      setTasks(list);
    } catch (err) {
      console.error('Erro ao buscar tarefas da disciplina:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const openDisciplineDetails = async (discipline) => {
    setSelectedDiscipline(discipline);
    await fetchDisciplineTasks(discipline.id);
  };

  const handleOpenDisciplineModal = (disciplineToEdit = null) => {
    if (disciplineToEdit) {
      setEditingDiscipline(disciplineToEdit);
      setDisciplineForm({
        name: disciplineToEdit.name,
        teacher: disciplineToEdit.teacher || '',
        hours: disciplineToEdit.hours || 60,
        description: disciplineToEdit.description || '',
        start_date: disciplineToEdit.start_date || '',
        end_date: disciplineToEdit.end_date || ''
      });
    } else {
      setEditingDiscipline(null);
      setDisciplineForm({
        name: '',
        teacher: '',
        hours: 60,
        description: '',
        start_date: '',
        end_date: ''
      });
    }
    setIsDisciplineModalOpen(true);
  };

  const handleSaveDiscipline = async (e) => {
    e.preventDefault();
    try {
      if (editingDiscipline) {
        await api.updateDiscipline(editingDiscipline.id, disciplineForm);
      } else {
        await api.createDiscipline(disciplineForm);
      }
      setIsDisciplineModalOpen(false);
      await loadDisciplines();
      if (selectedDiscipline && editingDiscipline && selectedDiscipline.id === editingDiscipline.id) {
        setSelectedDiscipline((prev) => ({ ...prev, ...disciplineForm }));
      }
    } catch (err) {
      alert(err.message || 'Erro ao salvar disciplina.');
    }
  };

  const handleDeleteDiscipline = async (disciplineId) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta disciplina e todas as suas tarefas?')) return;
    try {
      await api.deleteDiscipline(disciplineId);
      if (selectedDiscipline && selectedDiscipline.id === disciplineId) {
        setSelectedDiscipline(null);
      }
      await loadDisciplines();
    } catch (err) {
      alert(err.message || 'Erro ao excluir disciplina.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedDiscipline || !newTaskForm.title) return;

    try {
      await api.createTask({
        discipline_id: selectedDiscipline.id,
        ...newTaskForm
      });
      setNewTaskForm({
        title: '',
        description: '',
        due_date: '',
        status: 'Pendente',
        notes: '',
        hours_spent: 1
      });
      await fetchDisciplineTasks(selectedDiscipline.id);
      loadDisciplines();
    } catch (err) {
      alert(err.message || 'Erro ao adicionar tarefa.');
    }
  };

  // Sincroniza tarefas e disciplinas quando o cronômetro alterar
  useEffect(() => {
    const handleTimerChange = () => {
      if (selectedDiscipline?.id) {
        fetchDisciplineTasks(selectedDiscipline.id);
      }
      loadDisciplines();
    };
    window.addEventListener('edutrack:timer-changed', handleTimerChange);
    return () => window.removeEventListener('edutrack:timer-changed', handleTimerChange);
  }, [selectedDiscipline, fetchDisciplineTasks, loadDisciplines]);

  const handleToggleTaskStatus = async (task) => {
    const isDone = task.status === 'Concluída' || task.status === 'Concluida' || Boolean(task.concluida);
    const nextStatus = isDone ? 'Pendente' : 'Concluída';
    try {
      await api.updateTask(task.id, {
        title: task.titulo || task.title,
        description: task.descricao || task.description,
        due_date: task.data_prevista || task.due_date,
        status: nextStatus,
        concluida: !isDone,
        notes: task.lembretes || task.notes,
        hours_spent: task.horas_estimadas || task.hours_spent
      });
      await fetchDisciplineTasks(selectedDiscipline.id);
      loadDisciplines();
    } catch (err) {
      alert('Erro ao atualizar status da tarefa: ' + err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    try {
      await api.deleteTask(taskId);
      await fetchDisciplineTasks(selectedDiscipline.id);
      loadDisciplines();
    } catch (err) {
      alert('Erro ao excluir tarefa: ' + err.message);
    }
  };

  // Filtragem de Disciplinas no Cliente
  const filteredDisciplines = useMemo(() => {
    return disciplines.filter((d) => {
      const matchSearch =
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.teacher?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'pending') return (d.pending_tasks || 0) > 0;
      if (filterType === 'at_risk') return d.situacao_previsao === 'em_risco' || d.situacao_previsao === 'critico';
      if (filterType === 'finished') return (d.progress_percent || 0) >= 100;

      return true;
    });
  }, [disciplines, searchTerm, filterType]);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark dark:text-white tracking-tight">
            Minhas Disciplinas
          </h1>
          <p className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-xs sm:text-sm mt-1">
            Gerencie suas disciplinas acadêmicas, pendências e horas totais do semestre.
          </p>
        </div>

        <button
          onClick={() => handleOpenDisciplineModal(null)}
          className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 self-start sm:self-auto text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Disciplina</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros de Disciplinas */}
      <div className="bg-white dark:bg-brand-dark-surface p-4 rounded-2xl border border-brand-light dark:border-brand-dark-card shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-brand-dark/40 dark:text-brand-text-secondary-dark absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por matéria ou professor..."
            className="w-full pl-9 pr-8 py-2 bg-brand-light/30 dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card rounded-xl text-brand-dark dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-brand-gold outline-none"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5">
              <X className="w-3.5 h-3.5 text-brand-dark/40 dark:text-brand-text-secondary-dark" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'pending', label: 'Com Pendências' },
            { id: 'at_risk', label: 'Em Risco' },
            { id: 'finished', label: 'Concluídas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark shadow-sm'
                  : 'bg-brand-light/50 dark:bg-brand-dark text-brand-dark dark:text-white hover:bg-brand-gold/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Disciplinas */}
      {loading ? (
        <div className="py-16 text-center text-brand-gold space-y-2">
          <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">Carregando disciplinas...</p>
        </div>
      ) : filteredDisciplines.length === 0 ? (
        <div className="bg-white dark:bg-brand-dark-surface rounded-2xl p-10 text-center border border-brand-light dark:border-brand-dark-card shadow-sm max-w-lg mx-auto space-y-3">
          <BookOpen className="w-10 h-10 text-brand-gold mx-auto" />
          <h3 className="text-base font-bold text-brand-dark dark:text-white">
            Nenhuma disciplina encontrada
          </h3>
          <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
            {searchTerm || filterType !== 'all'
              ? 'Nenhum resultado corresponde à busca ou filtro selecionado.'
              : 'Cadastre as matérias do semestre para acompanhar tarefas e horas de dedicação.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDisciplines.map((d) => {
            const hasPending = (d.pending_tasks || 0) > 0;
            const progress = d.progress_percent || 0;

            return (
              <div
                key={d.id}
                onClick={() => openDisciplineDetails(d)}
                className="bg-white dark:bg-brand-dark-surface rounded-2xl p-5 border border-brand-light dark:border-brand-dark-card shadow-sm hover:shadow-md hover:border-brand-gold/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                      hasPending
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                    }`}>
                      {hasPending ? `${d.pending_tasks} pendente(s)` : 'Em dia'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDisciplineModal(d);
                      }}
                      className="p-1.5 rounded-lg text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:text-brand-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                      title="Editar disciplina"
                      aria-label="Editar disciplina"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-brand-dark dark:text-white group-hover:text-brand-gold transition leading-snug">
                    {d.name}
                  </h3>
                  <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-0.5">
                    Prof. {d.teacher || 'Não especificado'}
                  </p>

                  <div className="flex items-center gap-2 mt-3 text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark font-medium">
                    <span className="flex items-center gap-1 bg-brand-light/50 dark:bg-brand-dark px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3 text-brand-gold" /> {d.hours}h totais
                    </span>
                    <span className="flex items-center gap-1 bg-brand-light/50 dark:bg-brand-dark px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {d.completed_tasks || 0}/{d.total_tasks || 0} concluídas
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-brand-light dark:border-brand-dark-card">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark">Progresso</span>
                    <span className="font-bold text-brand-dark dark:text-white font-mono">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-brand-light dark:bg-brand-dark rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-brand-gold rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-brand-gold font-bold">
                    <span>Ver detalhes & tarefas</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detalhes da Disciplina & Lista de Tarefas */}
      {selectedDiscipline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-brand-dark-surface rounded-2xl shadow-2xl border border-brand-light dark:border-brand-dark-card overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-brand-dark text-white flex items-center justify-between border-b border-white/10">
              <div className="min-w-0">
                <h2 className="text-base font-bold truncate">{selectedDiscipline.name}</h2>
                <p className="text-xs text-brand-gold">
                  Prof. {selectedDiscipline.teacher} • {selectedDiscipline.hours}h
                </p>
              </div>
              <button
                onClick={() => setSelectedDiscipline(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Form Nova Tarefa */}
              <form onSubmit={handleCreateTask} className="p-4 bg-brand-light/30 dark:bg-brand-dark/30 rounded-xl border border-brand-light dark:border-brand-dark-card space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-dark dark:text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-brand-gold" /> Adicionar Tarefa Nesta Disciplina
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Título da atividade"
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                    className="px-3 py-2 text-xs rounded-lg border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white outline-none"
                  />
                  <input
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                    className="px-3 py-2 text-xs rounded-lg border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-brand-gold text-brand-dark font-bold text-xs rounded-lg shadow"
                  >
                    Adicionar
                  </button>
                </div>
              </form>

              {/* Lista de Tarefas */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary-light dark:text-brand-text-secondary-dark mb-3">
                  Tarefas Cadastradas ({tasks.length})
                </h4>

                {loadingTasks ? (
                  <div className="py-6 text-center text-brand-gold text-xs">Carregando tarefas...</div>
                ) : tasks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                    Nenhuma tarefa cadastrada nesta disciplina.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t) => {
                      const isDone = t.status === 'Concluída' || t.status === 'Concluida' || Boolean(t.concluida);
                      const isTimerActive = activeSession?.id_tarefa === t.id;

                      return (
                        <div
                          key={t.id}
                          className="p-3 rounded-xl border border-brand-light dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark/20 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button onClick={() => handleToggleTaskStatus(t)} className="p-0.5">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-brand-dark/40 dark:text-brand-text-secondary-dark" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <p className={`font-semibold text-brand-dark dark:text-white truncate ${isDone ? 'line-through opacity-60' : ''}`}>
                                {t.titulo || t.title}
                              </p>
                              {(t.data_prevista || t.due_date) && (
                                <p className="text-[11px] text-brand-text-secondary-light dark:text-brand-text-secondary-dark font-mono">
                                  Prazo: {t.data_prevista || t.due_date}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Cronômetro */}
                            {isTimerActive ? (
                              <button
                                onClick={pauseTimer}
                                className="px-2 py-1 bg-brand-gold text-brand-dark font-bold rounded-lg flex items-center gap-1 animate-pulse"
                                title="Pausar cronômetro"
                              >
                                <Pause className="w-3 h-3" /> Pausar
                              </button>
                            ) : (
                              <button
                                onClick={() => startTimer(t.id, { titulo: t.titulo || t.title, nome_disciplina: selectedDiscipline.name })}
                                className="p-1.5 text-brand-dark dark:text-white hover:text-brand-gold rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                                title="Iniciar cronômetro"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}

                            {/* Sessões Manuais */}
                            <button
                              onClick={() => setSessionModalTask(t)}
                              className="p-1.5 text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:text-brand-gold rounded-lg"
                              title="Ver/Registrar horas"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 rounded-lg"
                              title="Excluir tarefa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-brand-light/40 dark:bg-brand-dark/50 border-t border-brand-light dark:border-brand-dark-card flex justify-between">
              <button
                onClick={() => handleDeleteDiscipline(selectedDiscipline.id)}
                className="px-3 py-1.5 text-xs text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
              >
                Excluir Disciplina
              </button>
              <button
                onClick={() => setSelectedDiscipline(null)}
                className="px-4 py-1.5 bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark font-bold text-xs rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Disciplina */}
      {isDisciplineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-brand-dark-surface rounded-2xl shadow-2xl border border-brand-light dark:border-brand-dark-card overflow-hidden">
            <div className="px-6 py-4 bg-brand-dark text-white flex items-center justify-between border-b border-white/10">
              <h2 className="text-base font-bold">
                {editingDiscipline ? 'Editar Disciplina' : 'Nova Disciplina'}
              </h2>
              <button onClick={() => setIsDisciplineModalOpen(false)} className="p-1">
                <X className="w-5 h-5 text-white/70 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscipline} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Nome da Disciplina *
                </label>
                <input
                  type="text"
                  required
                  value={disciplineForm.name}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, name: e.target.value })}
                  placeholder="Ex: Banco de Dados II"
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Professor Responsável
                </label>
                <input
                  type="text"
                  value={disciplineForm.teacher}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, teacher: e.target.value })}
                  placeholder="Ex: Dra. Juliana Costa"
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Carga Horária Total (Horas) *
                </label>
                <input
                  type="number"
                  min="10"
                  step="1"
                  required
                  value={disciplineForm.hours}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, hours: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisciplineModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark text-xs font-bold rounded-xl shadow"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Tempo de Sessões */}
      {sessionModalTask && (
        <SessionManualModal
          isOpen={!!sessionModalTask}
          task={sessionModalTask}
          onClose={() => setSessionModalTask(null)}
          onSessionSaved={() => {
            if (selectedDiscipline) fetchDisciplineTasks(selectedDiscipline.id);
            loadDisciplines();
          }}
        />
      )}
    </div>
  );
}
