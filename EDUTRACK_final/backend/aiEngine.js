/**
 * EduTrack AI - Motor de Inteligência Analítica e Insights Preditivos
 * Processa estatísticas de tarefas, carga horária e prazos para gerar recomendações inteligentes.
 */

function generateInsights(disciplinesWithStats, tasks) {
  const insights = [];
  const now = new Date();
  
  let totalTasks = tasks.length;
  let completedTasks = tasks.filter(t => t.status === 'Concluída').length;
  let pendingTasks = tasks.filter(t => t.status === 'Pendente');
  let overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // 1. Análise de Prazos Próximos e Urgência
  const urgentTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    const diffDays = (dueDate - now) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 7;
  });

  if (urgentTasks.length > 0) {
    const disciplineNames = [...new Set(urgentTasks.map(t => t.discipline_name))].join(', ');
    insights.push({
      id: 'urgent-deadlines',
      type: 'warning',
      category: 'Prazos Iminentes',
      title: `${urgentTasks.length} tarefa(s) prioritária(s) nos próximos 7 dias`,
      message: `Identificamos entregas críticas em ${disciplineNames}. Recomendamos reservar blocos de foco dedicados para evitar sobrecarga.`,
      actionableTip: `Comece pela tarefa "${urgentTasks[0].title}". Dividir em etapas de 45 minutos aumentará sua retenção.`
    });
  }

  // 2. Análise de Gargalos (Disciplinas com menor progresso e tarefas pendentes)
  const laggingDisciplines = disciplinesWithStats.filter(d => d.total_tasks > 0 && d.progress_percent < 40 && d.pending_tasks > 0);
  if (laggingDisciplines.length > 0) {
    const target = laggingDisciplines[0];
    insights.push({
      id: 'bottleneck-detected',
      type: 'alert',
      category: 'Atenção ao Progresso',
      title: `Gargalo identificado em ${target.name}`,
      message: `Esta matéria está com apenas ${target.progress_percent}% de tarefas concluídas e ${target.pending_tasks} pendência(s).`,
      actionableTip: `Dedicar 1h30 nesta semana para avançar as atividades desta disciplina reduzirá em 60% o risco de acúmulo.`
    });
  }

  // 3. Análise de Distribuição de Tempo de Estudo
  const disciplinesWithHours = disciplinesWithStats.filter(d => d.hours_spent > 0);
  if (disciplinesWithHours.length >= 2) {
    const sortedByHours = [...disciplinesWithHours].sort((a, b) => b.hours_spent - a.hours_spent);
    const mostStudied = sortedByHours[0];
    const leastStudied = sortedByHours[sortedByHours.length - 1];

    if (mostStudied.hours_spent >= leastStudied.hours_spent * 2) {
      insights.push({
        id: 'study-balance',
        type: 'info',
        category: 'Equilíbrio da Carga',
        title: 'Descompasso na distribuição de horas de estudo',
        message: `Você registrou ${mostStudied.hours_spent}h em "${mostStudied.name}", mas apenas ${leastStudied.hours_spent}h em "${leastStudied.name}".`,
        actionableTip: `Tente balancear seu cronograma para não deixar matérias teóricas ou projetos secundários em segundo plano.`
      });
    }
  }

  // 4. Reconhecimento de Consistência e Ritmo Acadêmico
  if (overallProgress >= 50) {
    insights.push({
      id: 'high-velocity',
      type: 'success',
      category: 'Excelente Desempenho',
      title: `Ritmo acadêmico exemplar (${overallProgress}% concluído)`,
      message: `Mais da metade das suas obrigações do período já foram finalizadas com sucesso.`,
      actionableTip: `Mantenha revisões espaçadas dos tópicos concluídos para fixação a longo prazo.`
    });
  } else {
    insights.push({
      id: 'productivity-boost',
      type: 'info',
      category: 'Otimização de Rotina',
      title: 'Dica do EduTrack AI para a Semana',
      message: `Você tem ${pendingTasks.length} tarefas pendentes no total. A técnica Pomodoro aliada à matriz de Eisenhower é ideal para o seu perfil.`,
      actionableTip: `Experimente definir as 2 tarefas mais difíceis no início do dia quando seu nível de energia é mais alto.`
    });
  }

  return insights;
}

module.exports = { generateInsights };
