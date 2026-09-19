# EduTrack AI - MVP (Mínimo Produto Viável)

> Sistema web inteligente para acompanhamento de disciplinas acadêmicas, controle de tarefas/estudos, visualização de progresso e geração de insights com inteligência preditiva.

---

## 🎨 Identidade Visual & Design System

Desenvolvido rigorosamente conforme o arquivo de especificações (`espc telas ETRACK atualizado.txt`):
- **Tipografia**: [Jost (Google Fonts)](https://fonts.google.com/specimen/Jost)
- **Paleta de Cores**:
  - `#E7ECEF`: Fundos das telas internas, bordas e cartões suaves.
  - `#2C2E4C`: Fundos das telas de autenticação, barra lateral (sidebar), cabeçalhos e textos de alto contraste.
  - `#C8B755`: Dourado/amarelo para detalhes, badges de status, botões primários e destaques visuais.

---

## 📱 Telas & Recursos Implementados

### 1. Telas de Autenticação (`#2C2E4C`)
- **Tela de Login**:
  - Título `Etrack-AI` com ícone temático e detalhe em ouro.
  - Campos para e-mail e senha.
  - Botão para **mostrar/ocultar senha** (ícone de olho interativo).
  - Atalho de preenchimento com dados de demonstração com 1 clique.
  - Botão **Entrar**.
  - Links para **"Esqueceu sua senha?"** e **"Cadastre-se"**.

- **Tela de Cadastro**:
  - Campos: Nome, Sobrenome, E-mail, Senha (com toggle de visibilidade), Telefone.
  - Seletor de Curso (dropdown) com as opções especificadas:
    - *Ciência da Computação*
    - *Sistemas de Informação*
    - *Análise e Desenvolvimento de Sistemas*
  - Botão para envio e retorno ao login.

- **Fluxo de Recuperação de Senha (3 Etapas)**:
  1. **Tela Esqueceu a Senha - E-mail**: Descrição explicativa, campo de e-mail e geração de código de verificação.
  2. **Tela Esqueceu a Senha - Confirmação E-mail**: **5 campos numéricos independentes** para digitação do código com auto-avanço de foco e suporte a colar código completo.
  3. **Tela Esqueceu a Senha - Nova Senha**: Campos para nova senha e confirmação da senha (ambos com botões de ver/ocultar senha), validando requisitos e retornando ao Login com mensagem de sucesso.

### 2. Barra de Navegação Lateral (Sidebar)
- Localizada na parte lateral esquerda.
- Na parte superior:
  - **Círculo com foto de perfil** do usuário (ou avatar com as iniciais do aluno).
  - Saudação amigável personalizada (*"Olá, [Nome]! 👋"*).
  - Botão para **Sair/encerrar sessão**.
- Botões de navegação com **indicador visual claro de seleção** (`#C8B755`):
  - **Menu Principal** (Dashboard)
  - **Disciplinas**
  - **Perfil / Configuração**
- Suporte responsivo com menu drawer para smartphones e tablets.

### 3. Tela Inicial / Menu (Dashboard & Insights IA)
- **Cards de Métricas Rápidas**: Total de disciplinas ativas, tarefas pendentes, tarefas concluídas e horas totais dedicadas aos estudos.
- **Motor EduTrack AI Insights**:
  - Alertas inteligentes de entregas prioritárias nos próximos 7 dias.
  - Detecção preditiva de gargalos em matérias com baixa taxa de conclusão.
  - Diagnóstico de equilíbrio de horas dedicadas entre disciplinas.
  - Recomendações e técnicas de estudo (Pomodoro, Matriz de Eisenhower).
- **Gráficos Interativos**:
  - Gráfico de barras com **tempo gasto por disciplina** (horas registradas).
  - Gráfico de distribuição geral de tarefas (concluídas vs pendentes).
- **Progresso por Disciplina**: Barras de progresso com cálculo proporcional (%) baseado no cumprimento de tarefas.
- **Próximas Tarefas**: Lista resumida com prazos urgentes.

### 4. Tela de Disciplinas
- **Grid de Disciplinas em Formato de Cards ("Quadrados")**:
  - Nome da disciplina, professor responsável, carga horária e barra de progresso.
  - **Botão de edição** no canto superior direito do card.
  - **Ícone de sino de notificação** que sinaliza pendências ativas com contagem ou selo de "Em dia".
  - Botão de acesso ao histórico completo da disciplina.
- **Modal de Detalhes da Disciplina**:
  - Histórico de tarefas com abas de filtro (*Todas*, *Pendentes*, *Concluídas*).
  - Adição de novas tarefas (Título, Descrição, Data Prevista, Status, Horas dedicadas e Lembrete).
  - **Adicionar ou editar notas/lembretes simples** em cada tarefa.
  - Alternância de status com um clique (marcação visual com tachado).
  - Exclusão de tarefas.
- **Modal de Criação / Edição de Disciplina**:
  - Campos: Nome da disciplina, Nome do professor, Carga horária (horas), Descrição/ementa, Data de início e Data de término.
  - Exclusão completa da disciplina com remoção em cascata das tarefas associadas.

### 5. Tela de Perfil / Configuração
- Exibição e edição das informações cadastrais: Nome, Sobrenome, E-mail, Telefone e Curso.
- **Upload de foto de perfil** do computador (com preview instantâneo) ou seleção rápida entre avatares acadêmicos pré-definidos.
- Botão para salvar alterações com feedback visual.

---

## 🚀 Como Executar o Projeto

Como você já tem o **Node.js** instalado na máquina, o sistema está pronto para ser executado:

### Opção 1: Executar em Modo de Desenvolvimento (Recomendado)
Na raiz do projeto (`d:/EDUTRACK_mvpfinal`), execute:

```bash
npm run dev
```

Isso iniciará simultaneamente:
- **Backend**: `http://localhost:3001` (API REST com SQLite nativo)
- **Frontend**: `http://localhost:5173` (Interface interativa com hot-reload)

Acesse no seu navegador: **`http://localhost:5173`**

---

### Opção 2: Executar em Modo Integrado (Servidor Único)
O frontend já foi compilado para a pasta `frontend/dist`. Você pode iniciar apenas o backend, que servirá tanto a API quanto a interface web completa na mesma porta:

```bash
cd backend
npm start
```

Acesse no seu navegador: **`http://localhost:3001`**

---

## 🔑 Dados de Acesso para Teste Rápido

O banco de dados já vem populado com um usuário e disciplinas de exemplo:

- **E-mail**: `aluno@edutrack.ai`
- **Senha**: `123456`

*(Você também pode criar uma conta nova pelo botão "Cadastre-se" na tela de login).*
