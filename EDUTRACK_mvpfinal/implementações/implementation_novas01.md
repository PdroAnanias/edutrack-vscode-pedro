# Walkthrough - Implementação da Aba "Tarefas Gerais" e Centralização de Filtros

Todas as alterações solicitadas foram implementadas com sucesso no **EduTrack AI**.

---

## 🚀 O que foi implementado

### 1. 📌 Nova Aba na Barra Lateral: "Tarefas Gerais"
- Adicionada a opção **Tarefas Gerais** com ícone `CheckSquare` no menu lateral esquerdo ([`Sidebar.jsx`](file:///c:/Users/2601687/Desktop/edutrack-ai-pedro/EDUTRACK_mvpfinal/frontend/src/components/Sidebar.jsx)).
- Integrada ao roteamento da aplicação em [`App.jsx`](file:///c:/Users/2601687/Desktop/edutrack-ai-pedro/EDUTRACK_mvpfinal/frontend/src/App.jsx).

### 2. ⚡ Nova Página de Tarefas Gerais ([`GeneralTasks.jsx`](file:///c:/Users/2601687/Desktop/edutrack-ai-pedro/EDUTRACK_mvpfinal/frontend/src/pages/GeneralTasks.jsx))
- **Abas Internas**:
  - **Todas as Tarefas**: visão completa de todas as atividades com contadores em tempo real.
  - **Próximas Tarefas e Prazos**: visão dedicada aos compromissos urgentes e pendentes (migrada do Dashboard).
- **Filtros e Busca Centralizados**:
  - 🔍 **Busca textual**: pesquisa em tempo real por título da tarefa, notas, lembretes ou nome da disciplina.
  - 📚 **Filtro por Disciplina**: dropdown para selecionar uma matéria específica ou visualizar todas.
  - 📌 **Filtro por Status**: *Todos*, *Apenas Pendentes*, *Apenas Concluídas*.
  - ⏳ **Filtro por Situação de Prazo**:
    - *Todos os Prazos*
    - *Próximas do Prazo (≤ 7 dias / Urgentes)*
    - *Longe do Prazo (> 7 dias)*
    - *Atrasadas / Vencidas*
    - *Sem Prazo Definido*
- **Regra de Ordenação Padrão**:
  - Ordenação prioritária pelas **mais próximas do prazo** (datas mais cedo primeiro, seguidas por tarefas sem data).
  - Critério de desempate: **ordem alfabética (A-Z)** do título da tarefa.
  - Opções adicionais de ordenação (*Mais distantes do prazo*, *Alfabética A-Z*, *Alfabética Z-A*, *Mais recentes*).
- **Interações & Gestão de Tarefas**:
  - **Entrar na Tarefa (Modal de Detalhes)**: visualização completa com badges de prazo, disciplina, data formatada, dedicação de horas e lembretes.
  - Alternância de status com 1 clique (*Pendente* ⇄ *Concluída*).
  - Adição/edição rápida de lembretes e anotações simples direto na linha da tarefa.
  - Criação de novas tarefas com seleção de disciplina.
  - Edição e exclusão de tarefas.

### 3. 🎯 Menu Principal ([`Dashboard.jsx`](file:///c:/Users/2601687/Desktop/edutrack-ai-pedro/EDUTRACK_mvpfinal/frontend/src/pages/Dashboard.jsx))
- Removido o bloco inferior *"Próximas Tarefas e Prazos"*, deixando o painel focado nas métricas, insights de IA, gráfico de horas e progresso geral.

### 4. 📚 Aba Disciplinas ([`Disciplines.jsx`](file:///c:/Users/2601687/Desktop/edutrack-ai-pedro/EDUTRACK_mvpfinal/frontend/src/pages/Disciplines.jsx))
- Removidos os botões de filtro individual de status no modal de detalhes da disciplina, deixando a listagem direta e limpa, visto que os filtros completos estão centralizados na aba de **Tarefas Gerais**.

---

## 🧪 Validação & Build

- Executado `npm run build` no frontend com Vite 5:
  - **Status**: Compilação concluída com sucesso sem erros.
