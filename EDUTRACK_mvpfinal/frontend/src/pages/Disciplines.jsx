import React, { useState, useEffect } from 'react';
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
  Filter
} from 'lucide-react';
import { api } from '../services/api';

export default function Disciplines() {
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [selectedDiscipline, setSelectedDiscipline] = useState(null); // When opening discipline details/tasks
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState(null);

  // Form states for Discipline
  const [disciplineForm, setDisciplineForm] = useState({
    name: '',
    teacher: '',
    hours: 60,
    description: '',
    start_date: '',
    end_date: ''
  });

  // Tasks state inside details modal
  const [tasks, setTasks] = useState([]);
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

  // Load all disciplines
  const loadDisciplines = async () => {
    try {
      setLoading(true);
      const data = await api.getDisciplines();
      setDisciplines(data);
    } catch (err) {
      setError('Erro ao carregar disciplinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisciplines();
  }, []);

  // Load tasks when a discipline is selected
  const openDisciplineDetails = async (discipline) => {
    setSelectedDiscipline(discipline);
    try {
      const taskList = await api.getTasks(discipline.id);
      setTasks(taskList);
    } catch (err) {
      console.error(err);
    }
  };

  // Open modal to add or edit discipline
  const handleOpenDisciplineModal = (disciplineToEdit = null) => {
    if (disciplineToEdit) {
      setEditingDiscipline(disciplineToEdit);
      setDisciplineForm({
        name: disciplineToEdit.name,
        teacher: disciplineToEdit.teacher,
        hours: disciplineToEdit.hours,
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

  // Save (create or update) discipline
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
      // If currently open in detail modal, refresh it
      if (selectedDiscipline && editingDiscipline && selectedDiscipline.id === editingDiscipline.id) {
        setSelectedDiscipline(prev => ({ ...prev, ...disciplineForm }));
      }
    } catch (err) {
      alert(err.message || 'Erro ao salvar disciplina.');
    }
  };

  // Delete discipline
  const handleDeleteDiscipline = async (disciplineId) => {
    if (window.confirm('Tem certeza de que deseja excluir esta disciplina e todas as suas tarefas?')) {
      try {
        await api.deleteDiscipline(disciplineId);
        if (selectedDiscipline && selectedDiscipline.id === disciplineId) {
          setSelectedDiscipline(null);
        }
        await loadDisciplines();
      } catch (err) {
        alert(err.message || 'Erro ao excluir disciplina.');
      }
    }
  };

  // Add new task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedDiscipline || !newTaskForm.title) return;

    try {
      await api.createTask({
        discipline_id: selectedDiscipline.id,
        ...newTaskForm
      });
      // Reset form
      setNewTaskForm({
        title: '',
        description: '',
        due_date: '',
        status: 'Pendente',
        notes: '',
        hours_spent: 1
      });
      // Refresh tasks
      const updated = await api.getTasks(selectedDiscipline.id);
      setTasks(updated);
      loadDisciplines();
    } catch (err) {
      alert(err.message || 'Erro ao adicionar tarefa.');
    }
  };

  // Toggle task status
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
      const updated = await api.getTasks(selectedDiscipline.id);
      setTasks(updated);
      loadDisciplines();
    } catch (err) {
      alert('Erro ao atualizar status da tarefa.');
    }
  };

  // Save task note/reminder
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
      const updated = await api.getTasks(selectedDiscipline.id);
      setTasks(updated);
    } catch (err) {
      alert('Erro ao salvar lembrete.');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Excluir esta tarefa?')) {
      try {
        await api.deleteTask(taskId);
        const updated = await api.getTasks(selectedDiscipline.id);
        setTasks(updated);
        loadDisciplines();
      } catch (err) {
        alert('Erro ao excluir tarefa.');
      }
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark tracking-tight">
            Minhas Disciplinas
          </h1>
          <p className="text-brand-dark/70 text-sm mt-1">
            Gerencie suas disciplinas, controle tarefas pendentes e registre horas de estudo.
          </p>
        </div>

        <button
          onClick={() => handleOpenDisciplineModal(null)}
          className="inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold px-5 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Disciplina</span>
        </button>
      </div>

      {/* Grid de Disciplinas ("Quadrados") */}
      {loading ? (
        <div className="py-16 text-center text-brand-dark/60">
          <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Carregando disciplinas...
        </div>
      ) : disciplines.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-dark/10 shadow-sm max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-brand-gold mx-auto mb-3" />
          <h3 className="text-xl font-bold text-brand-dark">Nenhuma disciplina cadastrada</h3>
          <p className="text-sm text-brand-dark/60 mt-1 mb-5">
            Cadastre as matérias deste semestre para acompanhar seu progresso acadêmico.
          </p>
          <button
            onClick={() => handleOpenDisciplineModal(null)}
            className="px-4 py-2 rounded-xl bg-brand-gold text-brand-dark font-semibold text-sm"
          >
            Cadastrar Primeira Disciplina
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disciplines.map((d) => {
            const hasPending = d.pending_tasks > 0;

            return (
              <div
                key={d.id}
                className="bg-white rounded-3xl p-6 border border-brand-dark/10 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative"
              >
                {/* Top Corner: Edit Button & Pending Tasks Bell */}
                <div className="flex items-center justify-between mb-4">
                  {/* Bell icon with pending message indicator */}
                  <div className="relative">
                    {hasPending ? (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold"
                        title={`${d.pending_tasks} tarefa(s) pendente(s) nesta disciplina`}
                      >
                        <Bell className="w-3.5 h-3.5 fill-amber-500 text-amber-600 animate-pulse" />
                        <span>{d.pending_tasks} pendência{d.pending_tasks > 1 ? 's' : ''}</span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"
                        title="Tudo em dia!"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Em dia</span>
                      </div>
                    )}
                  </div>

                  {/* Edit button in the corner */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDisciplineModal(d);
                    }}
                    className="p-2 rounded-xl bg-brand-light/50 hover:bg-brand-dark hover:text-brand-light text-brand-dark/70 transition"
                    title="Editar informações da disciplina"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Main Discipline Info */}
                <div>
                  <h3 className="text-xl font-bold text-brand-dark leading-snug group-hover:text-brand-gold-hover transition">
                    {d.name}
                  </h3>
                  <p className="text-xs text-brand-dark/70 mt-1">
                    Prof. <strong className="font-semibold text-brand-dark">{d.teacher}</strong>
                  </p>

                  <div className="flex items-center gap-3 mt-3 text-xs text-brand-dark/60 font-medium">
                    <span className="flex items-center gap-1 bg-brand-light px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-brand-gold" />
                      {d.hours}h totais
                    </span>
                    <span className="flex items-center gap-1 bg-brand-light px-2.5 py-1 rounded-lg">
                      <BookOpen className="w-3.5 h-3.5 text-brand-dark" />
                      {d.completed_tasks}/{d.total_tasks} concluídas
                    </span>
                  </div>

                  {d.description && (
                    <p className="text-xs text-brand-dark/60 mt-3 line-clamp-2">
                      {d.description}
                    </p>
                  )}
                </div>

                {/* Bottom Progress & Action */}
                <div className="mt-5 pt-4 border-t border-brand-dark/10">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-brand-dark/70">Progresso</span>
                    <span className="font-bold text-brand-dark">{d.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-brand-dark/10 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-brand-gold rounded-full transition-all duration-500"
                      style={{ width: `${d.progress_percent}%` }}
                    />
                  </div>

                  {/* Button to enter & manage tasks */}
                  <button
                    onClick={() => openDisciplineDetails(d)}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-dark hover:bg-brand-dark-surface text-brand-light font-medium text-xs flex items-center justify-center gap-2 shadow transition"
                  >
                    <span>Ver Tarefas e Histórico</span>
                    <ChevronRight className="w-4 h-4 text-brand-gold" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALHES DA DISCIPLINA / TAREFAS / HISTÓRICO / NOTAS */}
      {/* ========================================================================= */}
      {selectedDiscipline && (
        <div className="fixed inset-0 z-50 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-brand-dark/10 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-brand-dark text-brand-light p-6 flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider">
                  Detalhes da Disciplina
                </span>
                <h2 className="text-2xl font-bold text-brand-light mt-0.5">
                  {selectedDiscipline.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-brand-light/70">
                  <span>Prof. {selectedDiscipline.teacher}</span>
                  <span>•</span>
                  <span>{selectedDiscipline.hours} horas totais</span>
                  <span>•</span>
                  <span className="text-brand-gold font-semibold">
                    {selectedDiscipline.completed_tasks} de {selectedDiscipline.total_tasks} tarefas concluídas ({selectedDiscipline.progress_percent}%)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDiscipline(null)}
                className="p-2 rounded-xl bg-brand-light/10 hover:bg-brand-light/20 text-brand-light transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Add New Task Form */}
              <div className="bg-brand-light/40 border border-brand-dark/10 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-brand-dark flex items-center gap-1.5 mb-3">
                  <Plus className="w-4 h-4 text-brand-gold" />
                  Adicionar Nova Tarefa à Disciplina
                </h3>

                <form onSubmit={handleCreateTask} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-brand-dark/70 mb-1">
                        Título da Tarefa *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Trabalho Prático 2, Lista de Exercícios..."
                        value={newTaskForm.title}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-dark/70 mb-1">
                        Data Prevista de Entrega
                      </label>
                      <input
                        type="date"
                        value={newTaskForm.due_date}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-dark/70 mb-1">
                      Descrição da Tarefa
                    </label>
                    <input
                      type="text"
                      placeholder="Detalhes sobre requisitos, escopo ou instruções do professor..."
                      value={newTaskForm.description}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-brand-dark/70 mb-1">
                        Status Inicial
                      </label>
                      <select
                        value={newTaskForm.status}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, status: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Concluída">Concluída</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-dark/70 mb-1">
                        Horas de Estudo Previstas
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={newTaskForm.hours_spent}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, hours_spent: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-dark/70 mb-1">
                        Nota / Lembrete Inicial
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Não esquecer bibliografia"
                        value={newTaskForm.notes}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, notes: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-brand-dark/15 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-brand-dark hover:bg-brand-dark-surface text-brand-light rounded-xl text-xs font-semibold transition"
                    >
                      Cadastrar Tarefa
                    </button>
                  </div>
                </form>
              </div>

              {/* Tasks List Header */}
              <div className="flex items-center justify-between border-b border-brand-dark/10 pb-3">
                <h3 className="font-bold text-brand-dark text-base">
                  Tarefas da Disciplina ({tasks.length})
                </h3>
              </div>

              {/* Task Items List */}
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-brand-dark/50 text-sm">
                    Nenhuma tarefa cadastrada nesta disciplina.
                  </div>
                ) : (
                  tasks.map((t) => {
                    const isCompleted = t.status === 'Concluída';

                    return (
                      <div
                        key={t.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCompleted
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-white border-brand-dark/15 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Toggle Completion */}
                            <button
                              onClick={() => handleToggleTaskStatus(t)}
                              className="mt-0.5 text-brand-dark/40 hover:text-brand-gold transition shrink-0"
                              title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            <div className="flex-1">
                              <h4
                                className={`text-sm font-semibold ${
                                  isCompleted ? 'line-through text-brand-dark/50' : 'text-brand-dark'
                                }`}
                              >
                                {t.title}
                              </h4>
                              {t.description && (
                                <p className="text-xs text-brand-dark/65 mt-0.5">{t.description}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-brand-dark/60">
                                {t.due_date && (
                                  <span className="flex items-center gap-1 font-medium text-brand-dark/70">
                                    <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                                    {new Date(t.due_date).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                                {t.hours_spent > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-brand-dark/50" />
                                    {t.hours_spent}h de estudo
                                  </span>
                                )}
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

                              {/* Nota / Lembrete Simples */}
                              <div className="mt-3 pt-2 border-t border-brand-dark/10">
                                {editingNoteTaskId === t.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      placeholder="Escreva um lembrete rápido..."
                                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-brand-dark/20 focus:outline-none focus:border-brand-gold bg-white"
                                    />
                                    <button
                                      onClick={() => handleSaveTaskNote(t)}
                                      className="px-2.5 py-1.5 rounded-lg bg-brand-gold text-brand-dark font-semibold text-xs"
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
                                    <div className="flex items-center gap-1.5 text-brand-dark/70">
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
                                      className="text-xs text-brand-gold-hover hover:underline ml-2"
                                    >
                                      {t.notes ? 'Editar nota' : '+ Lembrete'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Delete Task Button */}
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1.5 text-brand-dark/30 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                            title="Excluir tarefa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ADICIONAR / EDITAR DISCIPLINA */}
      {/* ========================================================================= */}
      {isDisciplineModalOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-brand-dark/10 overflow-hidden">
            <div className="bg-brand-dark text-brand-light p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  {editingDiscipline ? 'Editar Disciplina' : 'Nova Disciplina'}
                </h3>
                <p className="text-xs text-brand-light/60 mt-0.5">
                  Informe os dados da matéria para o seu semestre
                </p>
              </div>
              <button
                onClick={() => setIsDisciplineModalOpen(false)}
                className="p-2 rounded-xl bg-brand-light/10 hover:bg-brand-light/20 text-brand-light transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscipline} className="p-6 space-y-4">
              {/* Nome da disciplina */}
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">
                  Nome da Disciplina *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Engenharia de Software"
                  value={disciplineForm.name}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/10"
                />
              </div>

              {/* Nome do Professor */}
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">
                  Nome do Professor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Profª. Dra. Mariana Costa"
                  value={disciplineForm.teacher}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, teacher: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/10"
                />
              </div>

              {/* Carga Horária */}
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">
                  Carga Horária Total (Horas) *
                </label>
                <input
                  type="number"
                  required
                  min="10"
                  max="300"
                  value={disciplineForm.hours}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, hours: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/10"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">
                  Descrição / Ementa
                </label>
                <textarea
                  rows={2}
                  placeholder="Tópicos principais abordados na disciplina..."
                  value={disciplineForm.description}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/10"
                />
              </div>

              {/* Datas de Início e Término */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={disciplineForm.start_date}
                    onChange={(e) => setDisciplineForm({ ...disciplineForm, start_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold bg-brand-light/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1">
                    Data de Término
                  </label>
                  <input
                    type="date"
                    value={disciplineForm.end_date}
                    onChange={(e) => setDisciplineForm({ ...disciplineForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold bg-brand-light/10"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-between border-t border-brand-dark/10">
                {editingDiscipline ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteDiscipline(editingDiscipline.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Disciplina
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDisciplineModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-brand-dark/70 hover:text-brand-dark"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold text-xs shadow"
                  >
                    {editingDiscipline ? 'Salvar Alterações' : 'Criar Disciplina'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
