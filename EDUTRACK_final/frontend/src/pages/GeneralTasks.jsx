// ============================================================================
// EduTrack AI v2 - frontend/src/pages/GeneralTasks.jsx
// Central de Tarefas com Filtros no Servidor, Paginação, Cronômetro e Sessões
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  X,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  History,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useTimer } from '../context/TimerContext';
import SessionManualModal from '../components/SessionManualModal';

export default function GeneralTasks() {
  const { activeSession, startTimer, pauseTimer } = useTimer();

  // Dados do Servidor
  const [tasks, setTasks] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [counters, setCounters] = useState({ todas: 0, pendentes: 0, concluidas: 0, atrasadas: 0 });
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sincronização inicial com URL Query Params
  const getInitialParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      busca: params.get('busca') || '',
      disciplinas: params.get('disciplinas') ? params.get('disciplinas').split(',') : [],
      status: params.get('status') || 'todos',
      prazo: params.get('prazo') || 'todos',
      de: params.get('de') || '',
      ate: params.get('ate') || '',
      tempo: params.get('tempo') || 'todos',
      ordem: params.get('ordem') || 'prazo_asc',
      pagina: parseInt(params.get('pagina') || '1', 10),
      tamanho: parseInt(params.get('tamanho') || '20', 10),
    };
  };

  const initial = getInitialParams();

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState(initial.busca);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.busca);
  const [selectedDisciplines, setSelectedDisciplines] = useState(initial.disciplinas);
  const [statusFilter, setStatusFilter] = useState(initial.status);
  const [deadlineFilter, setDeadlineFilter] = useState(initial.prazo);
  const [dateFrom, setDateFrom] = useState(initial.de);
  const [dateTo, setDateTo] = useState(initial.ate);
  const [timeFilter, setTimeFilter] = useState(initial.tempo);
  const [sortBy, setSortBy] = useState(initial.ordem);
  const [page, setPage] = useState(initial.pagina);
  const [pageSize, setPageSize] = useState(initial.tamanho);

  // Modais
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [sessionModalTask, setSessionModalTask] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Form de criação/edição
  const [taskForm, setTaskForm] = useState({
    discipline_id: '',
    title: '',
    description: '',
    due_date: '',
    status: 'Pendente',
    notes: '',
    hours_estimated: 2.0,
  });

  // Debounce de busca textual (300 ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Volta à primeira página ao pesquisar
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Atualiza query string na URL sem recarregar
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('busca', debouncedSearch);
    if (selectedDisciplines.length > 0) params.set('disciplinas', selectedDisciplines.join(','));
    if (statusFilter !== 'todos') params.set('status', statusFilter);
    if (deadlineFilter !== 'todos') params.set('prazo', deadlineFilter);
    if (dateFrom) params.set('de', dateFrom);
    if (dateTo) params.set('ate', dateTo);
    if (timeFilter !== 'todos') params.set('tempo', timeFilter);
    if (sortBy !== 'prazo_asc') params.set('ordem', sortBy);
    if (page > 1) params.set('pagina', page);
    if (pageSize !== 20) params.set('tamanho', pageSize);

    const newQuery = params.toString();
    const newRelativePathQuery = window.location.pathname + (newQuery ? `?${newQuery}` : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [debouncedSearch, selectedDisciplines, statusFilter, deadlineFilter, dateFrom, dateTo, timeFilter, sortBy, page, pageSize]);

  // Carregar Disciplinas
  useEffect(() => {
    async function fetchDisciplines() {
      try {
        const discs = await api.getDisciplines();
        setDisciplines(discs);
      } catch (err) {
        console.error('Erro ao buscar disciplinas:', err);
      }
    }
    fetchDisciplines();
  }, []);

  // Carregar Tarefas com filtros no servidor
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    updateUrlParams();

    try {
      const res = await api.getTasks({
        busca: debouncedSearch,
        disciplinas: selectedDisciplines.join(','),
        status: statusFilter !== 'todos' ? statusFilter : undefined,
        prazo: deadlineFilter !== 'todos' ? deadlineFilter : undefined,
        de: dateFrom || undefined,
        ate: dateTo || undefined,
        tempo: timeFilter !== 'todos' ? timeFilter : undefined,
        ordem: sortBy,
        pagina: page,
        tamanho: pageSize,
      });

      setTasks(res.itens || []);
      setTotalTasks(res.total || 0);
      if (res.contadores) {
        setCounters(res.contadores);
      }
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      setError('Não foi possível carregar as tarefas.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedDisciplines, statusFilter, deadlineFilter, dateFrom, dateTo, timeFilter, sortBy, page, pageSize, updateUrlParams]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Atualiza automaticamente as tarefas quando o cronômetro iniciar ou pausar
  useEffect(() => {
    const handleTimerChange = () => {
      fetchTasks();
    };
    window.addEventListener('edutrack:timer-changed', handleTimerChange);
    return () => window.removeEventListener('edutrack:timer-changed', handleTimerChange);
  }, [fetchTasks]);

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedDisciplines([]);
    setStatusFilter('todos');
    setDeadlineFilter('todos');
    setDateFrom('');
    setDateTo('');
    setTimeFilter('todos');
    setSortBy('prazo_asc');
    setPage(1);
  };

  // Contagem de filtros ativos
  const activeFiltersCount = [
    debouncedSearch ? 1 : 0,
    selectedDisciplines.length > 0 ? 1 : 0,
    statusFilter !== 'todos' ? 1 : 0,
    deadlineFilter !== 'todos' ? 1 : 0,
    dateFrom || dateTo ? 1 : 0,
    timeFilter !== 'todos' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Alternar seleção de disciplina
  const toggleDisciplineSelection = (id) => {
    setSelectedDisciplines((prev) =>
      prev.includes(String(id))
        ? prev.filter((d) => d !== String(id))
        : [...prev, String(id)]
    );
    setPage(1);
  };

  // Atalhos de data
  const applyDateShortcut = (shortcut) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (shortcut === 'hoje') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (shortcut === 'semana') {
      const day = today.getDay();
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setDateFrom(monday.toISOString().split('T')[0]);
      setDateTo(sunday.toISOString().split('T')[0]);
    } else if (shortcut === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    }
    setPage(1);
  };

  // Alternar Status da Tarefa (Otimista)
  const handleToggleTaskStatus = async (task) => {
    const isCurrentlyDone = task.status === 'Concluída' || task.status === 'Concluida' || Boolean(task.concluida);
    const newStatus = isCurrentlyDone ? 'Pendente' : 'Concluída';
    const newConcluida = !isCurrentlyDone;

    // Atualização otimista
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus, concluida: newConcluida } : t))
    );

    try {
      await api.updateTask(task.id, {
        ...task,
        status: newStatus,
        concluida: newConcluida,
      });
      fetchTasks();
    } catch (err) {
      alert('Erro ao atualizar status da tarefa: ' + err.message);
      fetchTasks();
    }
  };

  // Exclusão de Tarefa
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa e suas sessões de estudo?')) return;
    try {
      await api.deleteTask(taskId);
      fetchTasks();
    } catch (err) {
      alert(err.message || 'Erro ao excluir tarefa.');
    }
  };

  // Abertura Modal Nova/Editar Tarefa
  const handleOpenAddModal = () => {
    setEditingTask(null);
    setTaskForm({
      discipline_id: disciplines[0]?.id || '',
      title: '',
      description: '',
      due_date: '',
      status: 'Pendente',
      notes: '',
      hours_estimated: 2.0,
    });
    setIsTaskModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      discipline_id: task.id_disciplina || task.discipline_id || '',
      title: task.titulo || task.title || '',
      description: task.descricao || task.description || '',
      due_date: task.data_prevista || task.due_date || '',
      status: task.status || (task.concluida ? 'Concluída' : 'Pendente'),
      notes: task.lembretes || task.notes || '',
      hours_estimated: task.horas_estimadas || 2.0,
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        discipline_id: parseInt(taskForm.discipline_id, 10),
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        due_date: taskForm.due_date || null,
        status: taskForm.status,
        notes: taskForm.notes.trim(),
        hours_spent: parseFloat(taskForm.hours_estimated) || 0,
      };

      if (editingTask) {
        await api.updateTask(editingTask.id, payload);
      } else {
        await api.createTask(payload);
      }

      setIsTaskModalOpen(false);
      fetchTasks();
    } catch (err) {
      alert(err.message || 'Erro ao salvar tarefa.');
    }
  };

  // Paginação
  const totalPages = Math.ceil(totalTasks / pageSize) || 1;

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark dark:text-white tracking-tight">
            Tarefas Gerais & Gestão de Prazos
          </h1>
          <p className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-xs sm:text-sm mt-1">
            Pesquise, filtre por data e matérias e acompanhe o cronômetro das suas atividades acadêmicas.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-brand-dark-surface p-4 rounded-2xl border border-brand-light dark:border-brand-dark-card shadow-sm space-y-4">
        {/* Linha 1: Input de Busca com debounce + Botão Filtros Mobile */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-dark/40 dark:text-brand-text-secondary-dark absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título da tarefa, anotações ou disciplina..."
              className="w-full pl-10 pr-10 py-2.5 bg-brand-light/40 dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card rounded-xl text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-dark/40 dark:text-brand-text-secondary-dark hover:text-brand-dark dark:hover:text-white"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2.5 bg-brand-light dark:bg-brand-dark rounded-xl text-xs font-bold text-brand-dark dark:text-white border border-brand-light dark:border-brand-dark-card"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand-gold" />
            <span>Filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
          </button>
        </div>

        {/* Linha 2: Filtros Desktop */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-brand-light dark:border-brand-dark-card text-xs">
          {/* Status */}
          <div>
            <label className="block font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-brand-light/40 dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card text-brand-dark dark:text-white font-medium focus:ring-1 focus:ring-brand-gold outline-none"
            >
              <option value="todos">Todos os Status ({counters.todas})</option>
              <option value="pendente">Apenas Pendentes ({counters.pendentes})</option>
              <option value="concluida">Apenas Concluídas ({counters.concluidas})</option>
              <option value="atrasada">Atrasadas / Vencidas ({counters.atrasadas})</option>
            </select>
          </div>

          {/* Prazo */}
          <div>
            <label className="block font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark mb-1">
              Situação de Prazo
            </label>
            <select
              value={deadlineFilter}
              onChange={(e) => {
                setDeadlineFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-brand-light/40 dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card text-brand-dark dark:text-white font-medium focus:ring-1 focus:ring-brand-gold outline-none"
            >
              <option value="todos">Todos os Prazos</option>
              <option value="proximas">Próximas (≤ 7 dias / Urgentes)</option>
              <option value="longe">Longe do Prazo (&gt; 7 dias)</option>
              <option value="vencidas">Atrasadas / Vencidas</option>
              <option value="sem_prazo">Sem Prazo Definido</option>
            </select>
          </div>

          {/* Tempo Dedicado */}
          <div>
            <label className="block font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark mb-1">
              Filtro de Tempo
            </label>
            <select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-brand-light/40 dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card text-brand-dark dark:text-white font-medium focus:ring-1 focus:ring-brand-gold outline-none"
            >
              <option value="todos">Todos os Tempos</option>
              <option value="sem_estimativa">Sem Estimativa</option>
              <option value="com_tempo">Com Tempo Registrado</option>
              <option value="estourou">Estourou a Estimativa</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label className="block font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark mb-1">
              Ordenação
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-brand-light/40 dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card text-brand-dark dark:text-white font-medium focus:ring-1 focus:ring-brand-gold outline-none"
            >
              <option value="prazo_asc">Mais Próximas do Prazo (Padrão)</option>
              <option value="prazo_desc">Mais Distantes do Prazo</option>
              <option value="az">Título (A-Z)</option>
              <option value="za">Título (Z-A)</option>
              <option value="recentes">Mais Recentes</option>
            </select>
          </div>
        </div>

        {/* Linha 3: Período De / Até com Atalhos */}
        <div className="hidden md:flex items-center justify-between gap-4 pt-2 border-t border-brand-light dark:border-brand-dark-card text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
              Período previsto:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-brand-light/40 dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card text-brand-dark dark:text-white outline-none"
            />
            <span className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark">até</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-brand-light/40 dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card text-brand-dark dark:text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => applyDateShortcut('hoje')}
              className="px-2.5 py-1 rounded-md bg-brand-light dark:bg-brand-dark hover:bg-brand-gold/20 text-brand-dark dark:text-white font-medium"
            >
              Hoje
            </button>
            <button
              onClick={() => applyDateShortcut('semana')}
              className="px-2.5 py-1 rounded-md bg-brand-light dark:bg-brand-dark hover:bg-brand-gold/20 text-brand-dark dark:text-white font-medium"
            >
              Esta Semana
            </button>
            <button
              onClick={() => applyDateShortcut('mes')}
              className="px-2.5 py-1 rounded-md bg-brand-light dark:bg-brand-dark hover:bg-brand-gold/20 text-brand-dark dark:text-white font-medium"
            >
              Este Mês
            </button>
          </div>
        </div>

        {/* Linha 4: Seleção Múltipla de Disciplinas (Chips) */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap pt-2 border-t border-brand-light dark:border-brand-dark-card text-xs">
          <span className="font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark mr-1">
            Disciplinas:
          </span>
          {disciplines.map((d) => {
            const isSelected = selectedDisciplines.includes(String(d.id));
            return (
              <button
                key={d.id}
                onClick={() => toggleDisciplineSelection(d.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isSelected
                    ? 'bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark font-bold shadow-sm'
                    : 'bg-brand-light/60 dark:bg-brand-dark text-brand-dark dark:text-white hover:bg-brand-gold/20'
                }`}
              >
                {d.nome}
              </button>
            );
          })}
        </div>

        {/* Linha 5: Chips de Filtros Ativos + Contador de Resultados */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-brand-light dark:border-brand-dark-card text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-brand-dark dark:text-white">
              {totalTasks} tarefa(s) encontrada(s)
            </span>

            {activeFiltersCount > 0 && (
              <>
                <span className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark">•</span>
                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold font-medium">
                    Busca: "{debouncedSearch}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                  </span>
                )}
                {statusFilter !== 'todos' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold font-medium">
                    Status: {statusFilter}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('todos')} />
                  </span>
                )}
                {deadlineFilter !== 'todos' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold font-medium">
                    Prazo: {deadlineFilter}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setDeadlineFilter('todos')} />
                  </span>
                )}
                {timeFilter !== 'todos' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold font-medium">
                    Tempo: {timeFilter}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setTimeFilter('todos')} />
                  </span>
                )}
                {(dateFrom || dateTo) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold font-medium">
                    Período ativo
                    <X className="w-3 h-3 cursor-pointer" onClick={() => { setDateFrom(''); setDateTo(''); }} />
                  </span>
                )}
                {selectedDisciplines.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold-text-light dark:text-brand-gold font-medium">
                    {selectedDisciplines.length} matéria(s)
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDisciplines([])} />
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold ml-1"
                >
                  Limpar todos
                </button>
              </>
            )}
          </div>

          {/* Seletor de Tamanho de Página */}
          <div className="hidden sm:flex items-center gap-1 text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
            <span>Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-transparent font-bold text-brand-dark dark:text-white outline-none cursor-pointer"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Painel de Filtros Mobile (Bottom Sheet / Drawer) */}
      {mobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-brand-dark-surface rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-brand-light dark:border-brand-dark-card pb-3">
              <h3 className="font-bold text-base text-brand-dark dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-gold" />
                Filtros de Tarefas
              </h3>
              <button onClick={() => setMobileFilterOpen(false)} className="p-1">
                <X className="w-5 h-5 text-brand-dark dark:text-white" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-brand-dark dark:text-white">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-brand-light dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark text-brand-dark dark:text-white"
                >
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendentes</option>
                  <option value="concluida">Concluídas</option>
                  <option value="atrasada">Atrasadas</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-brand-dark dark:text-white">Prazo</label>
                <select
                  value={deadlineFilter}
                  onChange={(e) => setDeadlineFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-brand-light dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark text-brand-dark dark:text-white"
                >
                  <option value="todos">Todos</option>
                  <option value="proximas">Próximas (≤ 7 dias)</option>
                  <option value="longe">Longe (&gt; 7 dias)</option>
                  <option value="vencidas">Atrasadas</option>
                  <option value="sem_prazo">Sem Prazo</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-brand-dark dark:text-white">Filtro de Tempo</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-brand-light dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark text-brand-dark dark:text-white"
                >
                  <option value="todos">Todos</option>
                  <option value="sem_estimativa">Sem Estimativa</option>
                  <option value="com_tempo">Com Tempo Registrado</option>
                  <option value="estourou">Estourou a Estimativa</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-brand-dark dark:text-white">Disciplinas</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                  {disciplines.map((d) => {
                    const isSelected = selectedDisciplines.includes(String(d.id));
                    return (
                      <button
                        key={`m-disc-${d.id}`}
                        onClick={() => toggleDisciplineSelection(d.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          isSelected ? 'bg-brand-gold text-brand-dark' : 'bg-brand-light dark:bg-brand-dark text-brand-dark dark:text-white'
                        }`}
                      >
                        {d.nome}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleClearFilters}
                  className="flex-1 py-2.5 rounded-xl bg-brand-light dark:bg-brand-dark font-bold text-brand-dark dark:text-white"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-gold text-brand-dark font-bold"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Tarefas */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-brand-gold space-y-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
            Carregando tarefas com filtros do servidor...
          </p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-brand-dark-surface rounded-2xl border border-brand-light dark:border-brand-dark-card space-y-3">
          <CheckSquare className="w-10 h-10 text-brand-gold mx-auto" />
          <h3 className="text-base font-bold text-brand-dark dark:text-white">
            {activeFiltersCount > 0 ? 'Nenhuma tarefa encontrada para estes filtros.' : 'Você não possui tarefas cadastradas.'}
          </h3>
          <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark max-w-sm mx-auto">
            {activeFiltersCount > 0
              ? 'Tente ajustar ou limpar seus filtros ativos para visualizar outras atividades.'
              : 'Clique no botão acima para adicionar sua primeira atividade acadêmica.'}
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-brand-gold text-brand-dark font-bold text-xs rounded-xl shadow mt-2"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-brand-dark-surface rounded-2xl border border-brand-light dark:border-brand-dark-card shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-light dark:border-brand-dark-card text-xs uppercase font-bold text-brand-text-secondary-light dark:text-brand-text-secondary-dark bg-brand-light/30 dark:bg-brand-dark/30">
                  <th className="py-3 px-4 w-10">Status</th>
                  <th className="py-3 px-4">Tarefa</th>
                  <th className="py-3 px-4">Disciplina</th>
                  <th className="py-3 px-4">Prazo Previsto</th>
                  <th className="py-3 px-4">Estimado</th>
                  <th className="py-3 px-4">Real Gasto</th>
                  <th className="py-3 px-4 text-center">Cronômetro / Horas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light dark:divide-brand-dark-card">
                {tasks.map((task) => {
                  const isDone = task.status === 'Concluída' || task.status === 'Concluida' || Boolean(task.concluida);
                  const isTimerActive = activeSession?.id_tarefa === task.id;
                  const realHours = (Number(task.horas_gastas_reais ?? task.horas_reais ?? task.hours_spent ?? 0)).toFixed(1);
                  const estimatedHours = task.horas_estimadas ? Number(task.horas_estimadas).toFixed(1) : null;
                  const estourou = estimatedHours && Number(realHours) > Number(estimatedHours);

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-brand-light/30 dark:hover:bg-brand-dark/20 transition ${
                        isDone ? 'opacity-65' : ''
                      }`}
                    >
                      {/* Status Checkbox */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className="p-1 rounded-lg text-brand-dark/40 dark:text-brand-text-secondary-dark hover:text-emerald-600 transition"
                          aria-label={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      {/* Título & Lembretes */}
                      <td className="py-3.5 px-4">
                        <p className={`font-semibold text-brand-dark dark:text-white ${isDone ? 'line-through' : ''}`}>
                          {task.titulo}
                        </p>
                        {task.lembretes && (
                          <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark truncate max-w-xs mt-0.5">
                            📌 {task.lembretes}
                          </p>
                        )}
                      </td>

                      {/* Disciplina */}
                      <td className="py-3.5 px-4 text-xs font-medium text-brand-dark dark:text-brand-light">
                        {task.nome_disciplina}
                      </td>

                      {/* Prazo */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {task.data_prevista ? (
                          <span className={task.situacao_prazo === 'vencida' ? 'text-red-500 font-bold' : 'text-brand-dark dark:text-white'}>
                            {task.data_prevista}
                          </span>
                        ) : (
                          <span className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark">Sem prazo</span>
                        )}
                      </td>

                      {/* Estimado */}
                      <td className="py-3.5 px-4 font-mono text-xs text-brand-dark dark:text-brand-light">
                        {estimatedHours ? `${estimatedHours}h` : '—'}
                      </td>

                      {/* Real Gasto */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className={estourou ? 'text-red-500 font-bold' : 'text-brand-dark dark:text-white'}>
                          {realHours}h
                        </span>
                      </td>

                      {/* Ações de Tempo: Cronômetro / Sessões */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isTimerActive ? (
                            <button
                              onClick={pauseTimer}
                              className="px-2.5 py-1 bg-brand-gold text-brand-dark font-bold text-xs rounded-lg shadow animate-pulse flex items-center gap-1"
                              title="Pausar cronômetro"
                            >
                              <Pause className="w-3 h-3" /> Pausar
                            </button>
                          ) : (
                            <button
                              onClick={() => startTimer(task.id, { titulo: task.titulo, nome_disciplina: task.nome_disciplina })}
                              className="p-1.5 text-brand-dark dark:text-white hover:text-brand-gold rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                              title="Iniciar cronômetro para esta tarefa"
                              aria-label="Iniciar cronômetro"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          )}

                          <button
                            onClick={() => setSessionModalTask(task)}
                            className="p-1.5 text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:text-brand-gold rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                            title="Ver histórico de sessões e registrar horas manuais"
                            aria-label="Registrar horas"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Editar / Excluir */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(task)}
                            className="p-1.5 text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:text-brand-dark dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                            aria-label="Editar tarefa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                            aria-label="Excluir tarefa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (< 768px) */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => {
              const isDone = task.status === 'Concluída' || task.status === 'Concluida' || Boolean(task.concluida);
              const isTimerActive = activeSession?.id_tarefa === task.id;
              const realHours = (Number(task.horas_gastas_reais ?? task.horas_reais ?? task.hours_spent ?? 0)).toFixed(1);
              const estimatedHours = task.horas_estimadas ? Number(task.horas_estimadas).toFixed(1) : null;

              return (
                <div
                  key={`m-${task.id}`}
                  className={`p-4 rounded-xl border border-brand-light dark:border-brand-dark-card bg-white dark:bg-brand-dark-surface shadow-sm space-y-3 ${
                    isDone ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="p-1 mt-0.5"
                        aria-label="Alternar status"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-brand-dark/40 dark:text-brand-text-secondary-dark" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm text-brand-dark dark:text-white ${isDone ? 'line-through' : ''}`}>
                          {task.titulo}
                        </p>
                        <p className="text-xs text-brand-gold font-medium mt-0.5 truncate">
                          {task.nome_disciplina}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(task)}
                        className="p-1.5 text-brand-text-secondary-light dark:text-brand-text-secondary-dark"
                        aria-label="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-red-500"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-brand-light dark:border-brand-dark-card text-brand-text-secondary-light dark:text-brand-text-secondary-dark font-mono">
                    <span>Prazo: {task.data_prevista || '—'}</span>
                    <span>
                      {realHours}h {estimatedHours ? `/ ${estimatedHours}h` : ''}
                    </span>
                  </div>

                  {/* Botões de Ação de Tempo */}
                  <div className="flex items-center gap-2 pt-1">
                    {isTimerActive ? (
                      <button
                        onClick={pauseTimer}
                        className="flex-1 py-2 bg-brand-gold text-brand-dark font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <Pause className="w-4 h-4" /> Pausar Cronômetro
                      </button>
                    ) : (
                      <button
                        onClick={() => startTimer(task.id, { titulo: task.titulo, nome_disciplina: task.nome_disciplina })}
                        className="flex-1 py-2 bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Iniciar Cronômetro
                      </button>
                    )}

                    <button
                      onClick={() => setSessionModalTask(task)}
                      className="px-3 py-2 bg-brand-light dark:bg-brand-dark text-brand-dark dark:text-white font-semibold text-xs rounded-xl flex items-center gap-1"
                    >
                      <History className="w-4 h-4" /> Horas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between pt-4 text-xs font-semibold text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
            <span>
              Página {page} de {totalPages} ({totalTasks} itens)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card text-brand-dark dark:text-white disabled:opacity-40"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card text-brand-dark dark:text-white disabled:opacity-40"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Gestão de Tempo e Sessões Manuais */}
      {sessionModalTask && (
        <SessionManualModal
          isOpen={!!sessionModalTask}
          task={sessionModalTask}
          onClose={() => setSessionModalTask(null)}
          onSessionSaved={fetchTasks}
        />
      )}

      {/* Modal de Nova/Editar Tarefa */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-brand-dark-surface rounded-2xl shadow-2xl border border-brand-light dark:border-brand-dark-card overflow-hidden">
            <div className="px-6 py-4 bg-brand-dark text-white flex items-center justify-between border-b border-white/10">
              <h2 className="text-base font-bold">
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              <button onClick={() => setIsTaskModalOpen(false)} className="p-1">
                <X className="w-5 h-5 text-white/70 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Disciplina *
                </label>
                <select
                  required
                  value={taskForm.discipline_id}
                  onChange={(e) => setTaskForm({ ...taskForm, discipline_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none"
                >
                  <option value="" disabled>Selecione uma disciplina</option>
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Ex: Trabalho Prático de Redes"
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                    Prazo Previsto
                  </label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                    Horas Estimadas
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={taskForm.hours_estimated}
                    onChange={(e) => setTaskForm({ ...taskForm, hours_estimated: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                  Lembretes / Anotações
                </label>
                <textarea
                  rows="2"
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  placeholder="Ex: Não esquecer de citar a referência IEEE"
                  className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-white dark:bg-brand-dark text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
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
    </div>
  );
}
