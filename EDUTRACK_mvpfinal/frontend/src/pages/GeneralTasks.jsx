import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  StickyNote,
  X,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  Layers,
  Hourglass,
  Check,
  CalendarClock,
  Eye,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export default function GeneralTasks() {
  const [tasks, setTasks] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active sub-tab inside General Tasks: 'all' | 'upcoming'
  const [activeView, setActiveView] = useState('all');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [deadlineFilter, setDeadlineFilter] = useState('all'); // 'all', 'urgent', 'distant', 'overdue', 'no_date'
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest' (padrão), 'furthest', 'az', 'za', 'newest'

  // Modals state
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null); // When clicking into a task
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false); // Add/Edit modal
  const [editingTask, setEditingTask] = useState(null);

  // Quick note inline editing
  const [editingNoteTaskId, setEditingNoteTaskId] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Form for new/edited task
  const [taskForm, setTaskForm] = useState({
    discipline_id: '',
    title: '',
    description: '',
    due_date: '',
    status: 'Pendente',
    notes: '',
    hours_spent: 1
  });

  // Load tasks & disciplines
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [allTasks, allDisciplines] = await Promise.all([
        api.getTasks(),
        api.getDisciplines()
      ]);
      setTasks(allTasks);
      setDisciplines(allDisciplines);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar tarefas e disciplinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to calculate deadline status and days remaining
  const getDeadlineInfo = (dueDate, status) => {
    if (!dueDate) {
      return {
        type: 'none',
        label: 'Sem prazo definido',
        badgeClass: 'bg-brand-dark/10 text-brand-dark/70 border-brand-dark/20',
        daysDiff: null
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = dueDate.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    targetDate.setHours(0, 0, 0, 0);

    const diffMs = targetDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      if (status === 'Concluída') {
        return {
          type: 'overdue_done',
          label: 'Concluída',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          daysDiff
        };
      }
      return {
        type: 'overdue',
        label: `${Math.abs(daysDiff)} dia${Math.abs(daysDiff) > 1 ? 's' : ''} em atraso`,
        badgeClass: 'bg-red-100 text-red-700 border-red-300 font-semibold',
        daysDiff
      };
    }

    if (daysDiff === 0) {
      return {
        type: 'urgent',
        label: 'Vence hoje!',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold animate-pulse',
        daysDiff
      };
    }

    if (daysDiff === 1) {
      return {
        type: 'urgent',
        label: 'Vence amanhã',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
        daysDiff
      };
    }

    if (daysDiff <= 7) {
      return {
        type: 'urgent',
        label: `Próximo: em ${daysDiff} dias`,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        daysDiff
      };
    }

    return {
      type: 'distant',
      label: `Em ${daysDiff} dias`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      daysDiff
    };
  };

  // Filter and Sort Pipeline
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by view tab
    if (activeView === 'upcoming') {
      // In upcoming view, show pending tasks or tasks with due dates
      result = result.filter(t => t.status === 'Pendente');
    }

    // Filter by discipline
    if (selectedDiscipline !== 'all') {
      result = result.filter(t => String(t.discipline_id) === String(selectedDiscipline));
    }

    // Filter by status
    if (statusFilter === 'pending') {
      result = result.filter(t => t.status === 'Pendente');
    } else if (statusFilter === 'completed') {
      result = result.filter(t => t.status === 'Concluída');
    }

    // Filter by deadline situation
    if (deadlineFilter !== 'all') {
      result = result.filter(t => {
        const info = getDeadlineInfo(t.due_date, t.status);
        if (deadlineFilter === 'urgent') {
          return info.type === 'urgent';
        }
        if (deadlineFilter === 'distant') {
          return info.type === 'distant';
        }
        if (deadlineFilter === 'overdue') {
          return info.type === 'overdue';
        }
        if (deadlineFilter === 'no_date') {
          return info.type === 'none';
        }
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => {
        const titleMatch = t.title?.toLowerCase().includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        const notesMatch = t.notes?.toLowerCase().includes(q);
        const discMatch = t.discipline_name?.toLowerCase().includes(q);
        return titleMatch || descMatch || notesMatch || discMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'nearest') {
        // Nearest deadline first; if tied, alphabetical by title (A-Z)
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;

        if (dateA !== dateB) {
          return dateA - dateB;
        }
        return (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
      }

      if (sortBy === 'furthest') {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : -Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : -Infinity;

        if (dateA !== dateB) {
          return dateB - dateA;
        }
        return (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
      }

      if (sortBy === 'az') {
        return (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
      }

      if (sortBy === 'za') {
        return (b.title || '').localeCompare(a.title || '', 'pt-BR', { sensitivity: 'base' });
      }

      if (sortBy === 'newest') {
        return b.id - a.id;
      }

      return 0;
    });

    return result;
  }, [tasks, activeView, selectedDiscipline, statusFilter, deadlineFilter, searchQuery, sortBy]);

  // Statistics for top summary
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Concluída').length;
    const pending = total - completed;
    const urgent = tasks.filter(t => {
      if (t.status !== 'Pendente') return false;
      const info = getDeadlineInfo(t.due_date, t.status);
      return info.type === 'urgent' || info.type === 'overdue';
    }).length;

    return { total, completed, pending, urgent };
  }, [tasks]);

  // Toggle status
  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'Concluída' ? 'Pendente' : 'Concluída';
    try {
      await api.updateTask(task.id, {
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        status: nextStatus,
        notes: task.notes,
        hours_spent: task.hours_spent
      });
      // Update local state instantly
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      if (selectedTaskDetail && selectedTaskDetail.id === task.id) {
        setSelectedTaskDetail(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      alert('Erro ao atualizar status da tarefa.');
    }
  };

  // Save inline note
  const handleSaveTaskNote = async (task) => {
    try {
      await api.updateTask(task.id, {
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        status: task.status,
        notes: noteText,
        hours_spent: task.hours_spent
      });
      setEditingNoteTaskId(null);
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, notes: noteText } : t))
      );
      if (selectedTaskDetail && selectedTaskDetail.id === task.id) {
        setSelectedTaskDetail(prev => ({ ...prev, notes: noteText }));
      }
    } catch (err) {
      alert('Erro ao salvar anotação.');
    }
  };

  // Open modal to create or edit task
  const handleOpenTaskModal = (taskToEdit = null) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setTaskForm({
        discipline_id: String(taskToEdit.discipline_id),
        title: taskToEdit.title,
        description: taskToEdit.description || '',
        due_date: taskToEdit.due_date || '',
        status: taskToEdit.status || 'Pendente',
        notes: taskToEdit.notes || '',
        hours_spent: taskToEdit.hours_spent || 1
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        discipline_id: disciplines.length > 0 ? String(disciplines[0].id) : '',
        title: '',
        description: '',
        due_date: '',
        status: 'Pendente',
        notes: '',
        hours_spent: 1
      });
    }
    setIsTaskModalOpen(true);
  };

  // Save task (Create / Update)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.discipline_id || !taskForm.title) {
      alert('Por favor selecione a disciplina e preencha o título.');
      return;
    }

    try {
      if (editingTask) {
        const res = await api.updateTask(editingTask.id, taskForm);
        setTasks(prev => prev.map(t => (t.id === editingTask.id ? res.task : t)));
        if (selectedTaskDetail && selectedTaskDetail.id === editingTask.id) {
          setSelectedTaskDetail(res.task);
        }
      } else {
        const res = await api.createTask(taskForm);
        setTasks(prev => [res.task, ...prev]);
      }
      setIsTaskModalOpen(false);
    } catch (err) {
      alert(err.message || 'Erro ao salvar tarefa.');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Tem certeza de que deseja excluir esta tarefa?')) {
      try {
        await api.deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        if (selectedTaskDetail && selectedTaskDetail.id === taskId) {
          setSelectedTaskDetail(null);
        }
      } catch (err) {
        alert(err.message || 'Erro ao excluir tarefa.');
      }
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto space-y-7">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-8 h-8 text-brand-gold" />
            Tarefas Gerais
          </h1>
          <p className="text-brand-dark/70 text-sm mt-1">
            Pesquise, filtre por disciplinas e prazos, e acompanhe o andamento de todas as suas atividades acadêmicas.
          </p>
        </div>

        <button
          onClick={() => handleOpenTaskModal(null)}
          disabled={disciplines.length === 0}
          className="inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50 text-brand-dark font-semibold px-5 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Mini KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-brand-dark/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-brand-dark/60 uppercase">Total de Tarefas</span>
            <p className="text-2xl font-bold text-brand-dark mt-0.5">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-dark/5 text-brand-dark flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-brand-dark/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-brand-dark/60 uppercase">Pendentes</span>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{stats.pending}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Hourglass className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-brand-dark/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-brand-dark/60 uppercase">Prazos Próximos</span>
            <p className="text-2xl font-bold text-red-600 mt-0.5">{stats.urgent}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
            <CalendarClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-brand-dark/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-brand-dark/60 uppercase">Concluídas</span>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-brand-dark/10 shadow-sm space-y-6">
        {/* Navigation Sub-Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-dark/10 pb-5">
          <div className="flex items-center gap-2 bg-brand-light p-1.5 rounded-2xl self-start">
            <button
              onClick={() => setActiveView('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeView === 'all'
                  ? 'bg-brand-dark text-brand-light shadow'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-brand-gold" />
              <span>Todas as Tarefas</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-light/20 text-brand-gold">
                {tasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveView('upcoming')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeView === 'upcoming'
                  ? 'bg-brand-dark text-brand-light shadow'
                  : 'text-brand-dark/70 hover:text-brand-dark'
              }`}
            >
              <CalendarClock className="w-4 h-4 text-brand-gold" />
              <span>Próximas Tarefas e Prazos</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                {tasks.filter(t => t.status === 'Pendente').length}
              </span>
            </button>
          </div>

          <div className="text-xs text-brand-dark/60 font-medium">
            Exibindo <strong>{filteredAndSortedTasks.length}</strong> de <strong>{tasks.length}</strong> tarefas
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 bg-brand-light/40 p-4 rounded-2xl border border-brand-dark/10">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-brand-dark/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por título, notas ou matéria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs md:text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter by Discipline */}
          <div className="lg:col-span-3">
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white font-medium text-brand-dark"
            >
              <option value="all">📚 Todas as Disciplinas</option>
              {disciplines.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status (in 'all' view) */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white font-medium text-brand-dark"
            >
              <option value="all">📌 Todos os Status</option>
              <option value="pending">⏳ Apenas Pendentes</option>
              <option value="completed">✅ Apenas Concluídas</option>
            </select>
          </div>

          {/* Filter by Deadline Situation */}
          <div className="lg:col-span-3">
            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white font-medium text-brand-dark"
            >
              <option value="all">⏳ Situação: Todos os Prazos</option>
              <option value="urgent">🔥 Próximas do Prazo (≤ 7 dias)</option>
              <option value="distant">📅 Longe do Prazo (&gt; 7 dias)</option>
              <option value="overdue">⚠️ Atrasadas / Vencidas</option>
              <option value="no_date">⚪ Sem Prazo Definido</option>
            </select>
          </div>
        </div>

        {/* Sorting & Quick Reset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-brand-gold" />
            <span className="text-xs font-semibold text-brand-dark">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-brand-dark/15 focus:outline-none focus:border-brand-gold bg-white font-medium text-brand-dark"
            >
              <option value="nearest">⚡ Mais próximas do prazo (Padrão + A-Z)</option>
              <option value="furthest">📅 Mais distantes do prazo</option>
              <option value="az">🔤 Ordem Alfabética (A-Z)</option>
              <option value="za">🔤 Ordem Alfabética (Z-A)</option>
              <option value="newest">🕒 Mais recentes cadastradas</option>
            </select>
          </div>

          {(searchQuery || selectedDiscipline !== 'all' || statusFilter !== 'all' || deadlineFilter !== 'all' || sortBy !== 'nearest') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDiscipline('all');
                setStatusFilter('all');
                setDeadlineFilter('all');
                setSortBy('nearest');
              }}
              className="text-xs text-brand-dark/60 hover:text-red-600 transition underline"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="py-16 text-center text-brand-dark/60">
            <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Carregando tarefas...
          </div>
        ) : filteredAndSortedTasks.length === 0 ? (
          <div className="bg-brand-light/30 rounded-2xl p-12 text-center border border-dashed border-brand-dark/20 max-w-lg mx-auto">
            <CheckSquare className="w-12 h-12 text-brand-gold mx-auto mb-3" />
            <h3 className="text-lg font-bold text-brand-dark">Nenhuma tarefa encontrada</h3>
            <p className="text-xs text-brand-dark/60 mt-1 mb-4">
              Nenhuma atividade corresponde aos critérios de pesquisa ou filtros selecionados.
            </p>
            <button
              onClick={() => handleOpenTaskModal(null)}
              className="px-4 py-2 rounded-xl bg-brand-gold text-brand-dark font-semibold text-xs shadow"
            >
              Adicionar Nova Tarefa
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedTasks.map((t) => {
              const isCompleted = t.status === 'Concluída';
              const deadlineInfo = getDeadlineInfo(t.due_date, t.status);

              return (
                <div
                  key={t.id}
                  className={`p-4 md:p-5 rounded-2xl border transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-brand-dark/15 hover:border-brand-gold/60 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 flex-1">
                      {/* Checkbox Toggle Button */}
                      <button
                        onClick={() => handleToggleTaskStatus(t)}
                        className="mt-1 text-brand-dark/40 hover:text-brand-gold transition shrink-0"
                        title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5 hover:text-brand-gold" />
                        )}
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {/* Discipline Tag */}
                          <span className="text-[11px] font-semibold text-brand-gold bg-brand-dark px-2.5 py-0.5 rounded-full inline-block">
                            {t.discipline_name}
                          </span>

                          {/* Deadline Situation Badge */}
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${deadlineInfo.badgeClass}`}
                          >
                            {deadlineInfo.label}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>

                        {/* Title (clickable to view detail) */}
                        <h3
                          onClick={() => setSelectedTaskDetail(t)}
                          className={`text-base font-bold cursor-pointer hover:text-brand-gold transition ${
                            isCompleted ? 'line-through text-brand-dark/50' : 'text-brand-dark'
                          }`}
                        >
                          {t.title}
                        </h3>

                        {/* Description */}
                        {t.description && (
                          <p className="text-xs text-brand-dark/70 mt-1 line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-brand-dark/60">
                          {t.due_date && (
                            <span className="flex items-center gap-1 font-medium text-brand-dark/80">
                              <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                              Prazo: {new Date(t.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}

                          {t.hours_spent > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-brand-dark/50" />
                              {t.hours_spent}h de estudo
                            </span>
                          )}
                        </div>

                        {/* Note / Lembrete */}
                        <div className="mt-3 pt-2.5 border-t border-brand-dark/10">
                          {editingNoteTaskId === t.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Escreva um lembrete ou anotação rápida..."
                                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-brand-dark/20 focus:outline-none focus:border-brand-gold bg-white"
                              />
                              <button
                                onClick={() => handleSaveTaskNote(t)}
                                className="px-2.5 py-1.5 rounded-lg bg-brand-gold text-brand-dark font-semibold text-xs shadow-sm"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingNoteTaskId(null)}
                                className="px-2 py-1.5 text-xs text-brand-dark/60 hover:text-brand-dark"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-brand-dark/75">
                                <StickyNote className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                                {t.notes ? (
                                  <span className="italic text-brand-dark/80">{t.notes}</span>
                                ) : (
                                  <span className="text-brand-dark/40">Nenhum lembrete adicionado</span>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setEditingNoteTaskId(t.id);
                                  setNoteText(t.notes || '');
                                }}
                                className="text-xs font-medium text-brand-gold-hover hover:underline ml-2 shrink-0"
                              >
                                {t.notes ? 'Editar nota' : '+ Lembrete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions button group */}
                    <div className="flex sm:flex-col items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-dark/10">
                      <button
                        onClick={() => setSelectedTaskDetail(t)}
                        className="p-2 rounded-xl bg-brand-light hover:bg-brand-dark hover:text-brand-light text-brand-dark/70 transition"
                        title="Ver detalhes da tarefa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenTaskModal(t)}
                        className="p-2 rounded-xl bg-brand-light hover:bg-brand-dark hover:text-brand-light text-brand-dark/70 transition"
                        title="Editar tarefa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-2 rounded-xl bg-brand-light hover:bg-red-600 hover:text-white text-brand-dark/40 transition"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DETALHES COMPLETOS DA TAREFA */}
      {/* ========================================================================= */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 z-50 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-brand-dark/10 overflow-hidden flex flex-col">
            <div className="bg-brand-dark text-brand-light p-6 flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider block">
                  {selectedTaskDetail.discipline_name}
                </span>
                <h2 className="text-2xl font-bold text-brand-light mt-1">
                  {selectedTaskDetail.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="p-2 rounded-xl bg-brand-light/10 hover:bg-brand-light/20 text-brand-light transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status & Deadline Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    selectedTaskDetail.status === 'Concluída'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Status: {selectedTaskDetail.status}
                </span>

                <span
                  className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    getDeadlineInfo(selectedTaskDetail.due_date, selectedTaskDetail.status).badgeClass
                  }`}
                >
                  {getDeadlineInfo(selectedTaskDetail.due_date, selectedTaskDetail.status).label}
                </span>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider text-brand-dark/60 mb-1">
                  Descrição
                </h4>
                <p className="text-sm text-brand-dark/80 bg-brand-light/40 p-3.5 rounded-2xl border border-brand-dark/10">
                  {selectedTaskDetail.description || 'Nenhuma descrição informada para esta tarefa.'}
                </p>
              </div>

              {/* Data & Hours Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-brand-light/30 border border-brand-dark/10">
                  <span className="text-xs text-brand-dark/60 block mb-1">Data de Entrega</span>
                  <span className="text-sm font-bold text-brand-dark flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-gold" />
                    {selectedTaskDetail.due_date
                      ? new Date(selectedTaskDetail.due_date).toLocaleDateString('pt-BR')
                      : 'Sem data definida'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-light/30 border border-brand-dark/10">
                  <span className="text-xs text-brand-dark/60 block mb-1">Dedicação de Estudo</span>
                  <span className="text-sm font-bold text-brand-dark flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-gold" />
                    {selectedTaskDetail.hours_spent || 0} horas
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider text-brand-dark/60 mb-1">
                  Lembrete / Anotações
                </h4>
                <p className="text-sm text-brand-dark/80 italic bg-amber-50/60 border border-amber-200/60 p-3.5 rounded-2xl">
                  {selectedTaskDetail.notes || 'Nenhum lembrete cadastrado.'}
                </p>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-brand-dark/10 flex items-center justify-between">
                <button
                  onClick={() => handleToggleTaskStatus(selectedTaskDetail)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                    selectedTaskDetail.status === 'Concluída'
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {selectedTaskDetail.status === 'Concluída'
                      ? 'Marcar como Pendente'
                      : 'Marcar como Concluída'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const taskToEdit = selectedTaskDetail;
                      setSelectedTaskDetail(null);
                      handleOpenTaskModal(taskToEdit);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-brand-dark text-brand-light hover:bg-brand-dark-surface text-xs font-semibold transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteTask(selectedTaskDetail.id)}
                    className="px-3.5 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-xs font-semibold transition"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ADICIONAR / EDITAR TAREFA */}
      {/* ========================================================================= */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-brand-dark/10 overflow-hidden">
            <div className="bg-brand-dark text-brand-light p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                </h3>
                <p className="text-xs text-brand-light/60 mt-0.5">
                  Preencha os detalhes da atividade acadêmica
                </p>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-2 rounded-xl bg-brand-light/10 hover:bg-brand-light/20 text-brand-light transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              {/* Disciplina */}
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">
                  Disciplina Associada *
                </label>
                <select
                  required
                  value={taskForm.discipline_id}
                  onChange={(e) => setTaskForm({ ...taskForm, discipline_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/10"
                >
                  <option value="">Selecione a disciplina...</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Prof. {d.teacher})
                    </option>
                  ))}
                </select>
              </div>

              {/* Título da Tarefa */}
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Trabalho Prático 2, Lista de Exercícios..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/10"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">
                  Descrição dos Requisitos
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes sobre a entrega, formato ou instruções..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/10"
                />
              </div>

              {/* Data Prevista e Horas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1">
                    Data de Entrega
                  </label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold bg-brand-light/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1">
                    Horas de Estudo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={taskForm.hours_spent}
                    onChange={(e) => setTaskForm({ ...taskForm, hours_spent: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold bg-brand-light/10"
                  />
                </div>
              </div>

              {/* Status e Lembrete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1">
                    Status
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold bg-brand-light/10"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1">
                    Lembrete / Nota Rápida
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Revisar com colega"
                    value={taskForm.notes}
                    onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold bg-brand-light/10"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-brand-dark/10">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-brand-dark/70 hover:bg-brand-light/40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold rounded-xl text-xs shadow transition"
                >
                  {editingTask ? 'Salvar Alterações' : 'Cadastrar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
