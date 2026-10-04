# Plano de Implementação - MVP EduTrack AI

Construção completa do MVP (Mínimo Produto Viável) para o sistema web **EduTrack AI**, projetado para resolver o problema de estudantes que perdem o controle do progresso acadêmico em múltiplas disciplinas simultâneas.

O projeto segue estritamente as diretrizes visuais e funcionais definidas no arquivo `espc telas ETRACK atualizado.txt`.

---

## 🎨 Identidade Visual & Design System

- **Tipografia**: Fonte **Jost** (Google Fonts importada globalmente).
- **Paleta de Cores**:
  - `Base Clara / Fundos internos`: `#E7ECEF`
  - `Base Escura / Sidebar / Auth`: `#2C2E4C`
  - `Destaque & Detalhes`: `#C8B755` (dourado/amarelo suave)
  - Variações tonais harmônicas para estados ativos, alertas, cartões e badges.

---

## 🏗️ Arquitetura do Projeto

Optamos por uma arquitetura full-stack moderna, rápida e de fácil execução local:

1. **Frontend (`frontend/`)**:
   - **React 18 + Vite**: Inicialização instantânea e alta performance.
   - **Tailwind CSS**: Estilização baseada em utilitários configurada com as cores e fonte do projeto.
   - **Lucide React**: Ícones modernos e consistentes (sino de tarefas pendentes, lápis de edição, etc.).
   - **Recharts**: Gráficos interativos para tempo gasto por disciplina e distribuição de tarefas.
   - **Context API / Custom Hooks**: Gerenciamento de sessão de autenticação e estado global.

2. **Backend (`backend/`)**:
   - **Node.js + Express**: API REST rápida e leve.
   - **Banco de Dados SQLite / Arquivo estruturado**: Sem necessidade de instalar servidores externos como PostgreSQL/MySQL. Pronto para rodar no Windows.
   - **Módulo EduTrack AI Insights**: Algoritmo de processamento de dados que analisa prazos, carga horária, taxa de conclusão de tarefas e emite diagnósticos (ex: disciplina com gargalo, risco de atraso, recomendação de foco de estudo semanal).
   - **Seeds Iniciais**: Dados de exemplo realistas (Cursos de TI, disciplinas e tarefas) para testar imediatamente.

3. **Orquestração na Raiz (`package.json`)**:
   - Scripts convenientes como `npm run dev` para subir frontend e backend simultaneamente com `concurrently`.

---

## 📱 Telas e Funcionalidades

### 1. Telas de Autenticação (`#2C2E4C` predominante)
- **Login**:
  - Título *EduTrack AI*.
  - Campos de email e senha com alternância de visibilidade (olho abrir/fechar).
  - Links para "Esqueceu sua senha" e "Cadastre-se".
  - Botão "Entrar" com feedback de carregamento.
- **Cadastro**:
  - Campos: Nome, Sobrenome, Email, Senha, Telefone.
  - Seletor de Curso: *Ciência da Computação*, *Sistemas de Informação* e *Análise e Desenvolvimento de Sistemas*.
  - Botão de envio e link para voltar ao Login.
- **Recuperação de Senha (Fluxo em 3 etapas)**:
  1. *Esqueceu a senha - Email*: Inserção do e-mail com explicação do fluxo.
  2. *Esqueceu a senha - Código*: 5 campos numéricos independentes para digitação do código de 5 dígitos (com auto-avanço de foco).
  3. *Esqueceu a senha - Nova Senha*: Redefinição com campo de nova senha e confirmação, ambos com toggle de visualização e redirecionamento ao Login.

### 2. Painel Interno & Navegação (`#E7ECEF` e `#2C2E4C`)
- **Barra Lateral (Sidebar)**:
  - Topo: Avatar circular do usuário, saudação amigável personalizada (*"Olá, [Nome]"*) e botão de logout (*Sair*).
  - Itens de navegação com indicador visual ativo (`#C8B755`):
    - *Menu Principal* (Dashboard)
    - *Disciplinas*
    - *Perfil / Configurações*

### 3. Tela Inicial / Menu (Dashboard)
- **Cards de Métricas Rápidas**: Total de disciplinas, tarefas pendentes, tarefas concluídas e horas totais.
- **Módulo de Insights IA**: Cartões inteligentes gerados a partir da análise dos dados do aluno (disciplinas prioritárias, alertas de prazos próximos, estimativa de dedicação necessária).
- **Gráficos**:
  - Gráfico de barras/pizza interativo: Horas dedicadas/gastas por disciplina.
  - Indicadores de progresso (%) calculado dinamicamente com base nas tarefas concluídas.
- **Lista de Tarefas Próximas**: Visão rápida dos compromissos mais urgentes.

### 4. Tela de Disciplinas
- **Cards de Disciplina**:
  - Nome da matéria, professor, carga horária total e botão de editar no canto.
  - Ícone de sino com contador de tarefas pendentes.
  - Barra de progresso visual de conclusão das tarefas da disciplina.
- **Modal / Aba de Detalhes da Disciplina**:
  - Histórico de tarefas concluídas vs pendentes.
  - Adição de tarefas (Título, Descrição, Data Prevista, Status: *Pendente / Concluída*, Lembretes/Notas).
  - Exclusão e alternância rápida de status de tarefa.
- **Modal de Criação / Edição de Disciplina**:
  - Nome, Professor, Carga Horária, Descrição, Data de Início e Data de Término.

### 5. Tela de Perfil / Configurações
- Visualização e edição dos dados cadastrais (Nome, Sobrenome, Email, Telefone, Curso).
- Upload ou seleção de foto de perfil (com preview instantâneo).
- Preferências de notificação ou metas de estudo semanais.

---

## 🛠️ Plano de Execução Passo a Passo

1. **Configuração da Estrutura Full-Stack**:
   - Inicializar `backend/` com `express`, `cors`, `sqlite3` ou store em arquivo com queries estruturadas.
   - Inicializar `frontend/` com `vite`, `react`, `tailwindcss`, `lucide-react`, `recharts`.
   - Configurar o tema Tailwind com as cores e fonte Jost.
2. **Desenvolvimento do Backend**:
   - Rotas de autenticação (Login, Registro, Reset de senha em 3 etapas).
   - Rotas CRUD para Disciplinas e Tarefas.
   - Endpoint de Perfil do Usuário.
   - Motor de Inteligência / Insights (`/api/insights`).
   - Script de carga com dados de exemplo (Seeds).
3. **Desenvolvimento do Frontend**:
   - Layout mestre com Sidebar responsiva e Header de boas-vindas.
   - Fluxo de telas de Autenticação (Login, Cadastro, 3 telas de Esqueceu Senha).
   - Tela de Dashboard com widgets analíticos e gráficos.
   - Tela de Disciplinas em grid de cards + modais de gerenciamento e tarefas.
   - Tela de Perfil/Configurações com upload de avatar e edição.
4. **Testes & Verificação**:
   - Testar o fluxo completo de autenticação e recuperação de senha.
   - Testar cadastro, edição e exclusão de disciplinas e tarefas.
   - Validar cálculo do progresso (%) e gráficos.
   - Validar o motor de insights inteligentes.

---

## 🔍 Plano de Verificação

### Testes Manuais & Automatizados
- Executar `npm run dev` na raiz para conferir que ambos os serviços sobem perfeitamente.
- Testar cada endpoint da API com requisições HTTP locais.
- Testar responsividade e fidelidade às diretrizes do arquivo `espc telas ETRACK atualizado.txt`.
