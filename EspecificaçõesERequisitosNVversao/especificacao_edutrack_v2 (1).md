# Especificação Técnica - EduTrack AI v2

> Documento de requisitos para evolução do MVP existente do **EduTrack AI**.
> Leia o documento inteiro antes de começar. **Gere primeiro um plano de implementação (implementation_plan) e só então execute, fase por fase (Seção 12).**
> **Revisão 2:** requisitos não funcionais consolidados na **Seção 10** (JWT, desempenho < 2 s, web/mobile, Gemini, temas claro/escuro) e refletidos nas demais seções.

---

## 0. Instruções ao agente

1. O MVP atual (React 18 + Vite + Tailwind + Recharts no frontend; Node + Express no backend; SQLite) **continua sendo a base**. Não reescreva o que já funciona.
2. **Não quebre nada do MVP.** Login, cadastro, recuperação de senha em 3 etapas, Sidebar, Disciplinas, Perfil e Tarefas Gerais devem continuar funcionando após cada fase.
3. **Mantenha a identidade visual**: fonte **Jost**; cores `#E7ECEF` (fundos internos), `#2C2E4C` (sidebar/auth/textos fortes), `#C8B755` (destaques). Todos os novos componentes seguem essa paleta.
4. Idioma de toda a interface, mensagens, relatórios e documentação: **português do Brasil (pt-BR)**. Código e nomes de variáveis podem ser em inglês ou português, mas **seja consistente** (nomes de tabelas e colunas do banco em português, conforme a Seção 2).
5. Segurança: nenhuma chave de API ou senha no código ou no frontend. Tudo em arquivos `.env` (com `.env.example` versionado). Todas as queries SQL devem ser **parametrizadas** (nunca concatenar strings).
6. Ao final de cada fase, rode build/testes e informe o resultado.
7. **Os requisitos não funcionais (Seção 10) valem para todas as fases** e têm precedência sobre decisões de implementação deste documento. Se algo conflitar com segurança, desempenho (< 2 s), usabilidade mobile ou acessibilidade, siga a Seção 10 e registre a decisão no plano.
8. Crie na raiz um arquivo de contexto do projeto (`GEMINI.md`) conforme a Seção 10.4, para manter o desenvolvimento consistente entre sessões.

---

## 1. Visão Geral e Arquitetura

### 1.1 Escopo da v2

| # | Funcionalidade | Resumo |
|---|---|---|
| 1 | Banco de dados SQL Server | Migrar de SQLite para SQL Server local, com dicionário de dados, índices, views, seeds e script de migração |
| 2 | Cálculo Avançado de Progresso | Microsserviço Python: progresso ponderado, velocidade e previsão de conclusão, exibido no Dashboard |
| 3 | Busca e Filtros Avançados | Evolução da aba "Tarefas Gerais" (já existente) + busca global, com filtros processados no servidor |
| 4 | Insights com IA | Recomendações personalizadas com base em Tempo Estimado vs. Tempo Real |
| 5 | Relatório Semanal em PDF | Gerado em Python, sob demanda, por botão na tela (geração assíncrona) |
| RNF | Requisitos não funcionais | Segurança (JWT, dados privados), desempenho (API < 2 s, 1.000+ usuários), usabilidade web e mobile, IA principal Gemini, acessibilidade (tema claro/escuro, texto legível). Ver **Seção 10** |

Além disso, é um requisito transversal a **captura de tempo real** (cronômetro + ajuste manual), pois os itens 2, 4 e 5 dependem desses dados.

### 1.2 Arquitetura

```
┌──────────────────┐   HTTP/JSON   ┌────────────────────┐   SQL (mssql)   ┌─────────────────────┐
│ Frontend         │ ────────────► │ Backend Node       │ ──────────────► │ SQL Server (local)  │
│ React + Vite     │               │ Express  :3001     │                 │ DB: EduTrackAI      │
│ :5173            │ ◄──────────── │ (API pública, JWT) │ ◄────────────── │ :1433               │
└──────────────────┘               └─────────┬──────────┘                 └──────────▲──────────┘
                                             │ HTTP + X-Internal-Key                  │ SQL somente leitura
                                             ▼                                        │ (pyodbc/SQLAlchemy)
                                   ┌────────────────────┐                             │
                                   │ Analytics Service  │ ────────────────────────────┘
                                   │ Python FastAPI     │
                                   │ :8000 (só localhost)│ ──► API Gemini (Google)
                                   └────────────────────┘
```

**Decisões fechadas:**

- O frontend **nunca** fala com o FastAPI. Só o Node fala. O Node valida o JWT do usuário e repassa o `id_usuario` ao serviço Python, com o cabeçalho `X-Internal-Key` (segredo compartilhado via `.env`).
- O serviço Python acessa o SQL Server **apenas para leitura**, com um login dedicado (`edutrack_py_ro`, papel `db_datareader`). Quem grava no banco é sempre o Node.
- O FastAPI escuta somente em `127.0.0.1:8000`.
- Cache de insights é gravado pelo Node (tabela `InsightCache`), não pelo Python.
- **Autenticação JWT própria no backend Node** (Seção 10.1). O Node é *stateless* (sem sessão em memória; caches são só otimização), o que permite rodar várias instâncias atrás de um balanceador.
- **Nenhuma chamada HTTP deve passar de 2 segundos** (Seção 10.2). Operações lentas (IA e PDF) são **assíncronas**: a requisição responde na hora e o resultado é entregue depois (Seções 5.6 e 7.1).
- A **IA principal é o Gemini** (Google), acessado pela API do Gemini a partir do serviço Python (Seções 5 e 10.4).

---

## 2. Banco de Dados - SQL Server

### 2.1 Ambiente

- **SQL Server Express ou Developer instalado localmente no Windows**.
- Instância padrão esperada: `localhost\SQLEXPRESS` (configurável por `.env`). Banco: `EduTrackAI`.
- Requisitos que a documentação de setup deve cobrir (passo a passo): habilitar **TCP/IP** (porta 1433) no SQL Server Configuration Manager, habilitar **autenticação mista**, instalar o **ODBC Driver 18 for SQL Server**, e reiniciar o serviço.
- Logins:
  - `edutrack_app`: usado pelo Node (`db_datareader` + `db_datawriter` + permissão de `EXECUTE`).
  - `edutrack_py_ro`: usado pelo Python (`db_datareader` apenas).
- Driver Node: pacote `mssql` (tedious). Driver Python: `pyodbc` + `SQLAlchemy`.
- Connection string local deve usar `TrustServerCertificate=yes` (ambiente de desenvolvimento).
- **Escala:** o SQL Server Express tem limites (10 GB por banco, cerca de 1,4 GB de memória para cache de dados e 4 núcleos), suficientes para o volume de 1.000+ usuários desta especificação. O schema e as queries **não podem depender de recursos exclusivos de edições pagas**, para permitir migrar depois para Standard ou Azure SQL sem alterações.

### 2.2 Convenções

- Tabelas em **PascalCase no plural** (`Usuarios`), colunas em **snake_case** minúsculo, chave primária `id_<entidade>`.
- Datas/horas de auditoria em **UTC** (`DATETIME2(0)` com `SYSUTCDATETIME()`); a conversão para `America/Sao_Paulo` é feita na aplicação. Datas de negócio (`data_prevista`, `data_inicio`, `data_fim`) são do tipo `DATE`.
- Texto em `NVARCHAR` (acentos).
- Todo `CHECK`, `UNIQUE` e `FK` deve ter **nome explícito** (ex.: `CK_Tarefas_status`, `FK_Tarefas_Disciplinas`).
- **Atenção a caminhos de cascata múltiplos**: o SQL Server rejeita `ON DELETE CASCADE` quando uma tabela é alcançada por mais de um caminho. Por isso `SessoesEstudo.id_usuario` e `HistoricoAtividades.id_usuario` usam `NO ACTION`; a exclusão de usuário deve ser feita por procedimento/serviço que remove esses registros antes. A cascata `Usuarios → Disciplinas → Tarefas → SessoesEstudo` permanece via `id_tarefa`.

### 2.3 Dicionário de Dados

> Este dicionário é a **fonte de verdade** do schema. O agente deve gerar o DDL a partir dele e entregar também o dicionário em arquivo próprio (Seção 2.7).

#### `Cursos`
Cursos de graduação disponíveis no cadastro.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_curso | INT IDENTITY(1,1) | Não | PK | Identificador do curso |
| nome | NVARCHAR(100) | Não | UQ_Cursos_nome | Nome do curso. Valores iniciais: *Ciência da Computação*, *Sistemas de Informação*, *Análise e Desenvolvimento de Sistemas* |

#### `Usuarios`
Estudantes cadastrados.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_usuario | INT IDENTITY(1,1) | Não | PK | Identificador do usuário |
| nome | NVARCHAR(60) | Não | | Primeiro nome |
| sobrenome | NVARCHAR(100) | Não | | Sobrenome |
| email | NVARCHAR(254) | Não | UQ_Usuarios_email | E-mail de login (armazenar em minúsculas) |
| senha_hash | NVARCHAR(255) | Não | | Hash **bcrypt** da senha. Nunca guardar senha em texto puro |
| telefone | NVARCHAR(20) | Sim | | Telefone de contato |
| id_curso | INT | Não | FK → Cursos | Curso do aluno |
| foto_perfil | NVARCHAR(500) | Sim | | Caminho do arquivo enviado ou identificador do avatar pré-definido |
| meta_semanal_horas | DECIMAL(5,2) | Não | DEFAULT 10; CHECK entre 0 e 168 | Meta de horas de estudo por semana (usada em métricas e relatório) |
| tema_preferido | NVARCHAR(10) | Não | DEFAULT 'sistema'; CK_Usuarios_tema IN ('claro','escuro','sistema') | **NOVO.** Tema da interface. `sistema` segue o tema do dispositivo (Seção 10.5) |
| tamanho_texto | NVARCHAR(12) | Não | DEFAULT 'normal'; CK_Usuarios_texto IN ('normal','grande','muito_grande') | **NOVO.** Tamanho de texto escolhido pelo aluno (100%, 115%, 130%) |
| ia_habilitada | BIT | Não | DEFAULT 1 | **NOVO.** Se 0, nenhum dado do aluno é enviado ao Gemini; os insights usam só regras (Seção 5.4) |
| ativo | BIT | Não | DEFAULT 1 | Conta ativa |
| criado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Data de criação (UTC) |
| atualizado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Última alteração (UTC) |

#### `RecuperacaoSenha`
Códigos de recuperação de senha (fluxo de 3 etapas).

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_recuperacao | INT IDENTITY(1,1) | Não | PK | Identificador |
| id_usuario | INT | Não | FK → Usuarios, ON DELETE CASCADE | Usuário solicitante |
| codigo_hash | NVARCHAR(255) | Não | | Hash do código numérico de 5 dígitos |
| expira_em | DATETIME2(0) | Não | | Validade (sugestão: 15 minutos) |
| tentativas | TINYINT | Não | DEFAULT 0; CHECK ≤ 5 | Tentativas de validação (bloqueia após 5) |
| usado | BIT | Não | DEFAULT 0 | Código já consumido |
| criado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Data de geração |

#### `RefreshTokens`
**NOVA.** Controle de sessões de login (refresh tokens do JWT). Permite renovar o acesso sem pedir senha de novo (importante no celular) e encerrar sessões com segurança.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_refresh | BIGINT IDENTITY(1,1) | Não | PK | Identificador |
| id_usuario | INT | Não | FK → Usuarios, ON DELETE CASCADE | Dono da sessão |
| token_hash | CHAR(64) | Não | UQ_RefreshTokens_hash | SHA-256 do refresh token. **O token em si nunca é gravado** |
| familia | UNIQUEIDENTIFIER | Não | | Agrupa tokens encadeados por rotação; usado para detectar reuso |
| expira_em | DATETIME2(0) | Não | | Validade (7 dias) |
| revogado_em | DATETIME2(0) | Sim | | Preenchido no logout, na rotação ou ao detectar reuso |
| criado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Emissão (UTC) |
| user_agent | NVARCHAR(200) | Sim | | Navegador/dispositivo (informativo) |

#### `Disciplinas`
Matérias cursadas pelo aluno.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_disciplina | INT IDENTITY(1,1) | Não | PK | Identificador |
| id_usuario | INT | Não | FK → Usuarios, ON DELETE CASCADE | Dono da disciplina |
| nome | NVARCHAR(120) | Não | UQ (id_usuario, nome) | Nome da disciplina |
| professor | NVARCHAR(120) | Sim | | Professor responsável |
| carga_horaria | INT | Não | CHECK > 0 | Carga horária total (horas) |
| descricao | NVARCHAR(1000) | Sim | | Descrição/ementa |
| data_inicio | DATE | Não | | Início da disciplina |
| data_fim | DATE | Não | CHECK ≥ data_inicio | Término previsto |
| criado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Criação (UTC) |
| atualizado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Última alteração (UTC) |

#### `Tarefas`
Atividades de cada disciplina.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_tarefa | INT IDENTITY(1,1) | Não | PK | Identificador |
| id_disciplina | INT | Não | FK → Disciplinas, ON DELETE CASCADE | Disciplina da tarefa |
| titulo | NVARCHAR(150) | Não | | Título |
| descricao | NVARCHAR(2000) | Sim | | Descrição detalhada |
| data_prevista | DATE | Sim | | Prazo de entrega (NULL = sem prazo) |
| status | NVARCHAR(10) | Não | DEFAULT 'Pendente'; CK_Tarefas_status IN ('Pendente','Concluida') | Situação. **"Atrasada" não é status gravado**: é derivada (pendente com prazo vencido) |
| horas_estimadas | DECIMAL(6,2) | Sim | CHECK > 0 | **NOVO.** Tempo estimado pelo aluno para concluir (horas). Base do comparativo Estimado vs. Real |
| lembrete_nota | NVARCHAR(500) | Sim | | Lembrete/anotação simples |
| concluida_em | DATETIME2(0) | Sim | CK: (status='Concluida' AND concluida_em IS NOT NULL) OR (status='Pendente' AND concluida_em IS NULL) | **NOVO.** Momento da conclusão (UTC). Essencial para velocidade e relatório |
| criado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Criação (UTC). Essencial para o relatório ("tarefas adicionadas") |
| atualizado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Última alteração (UTC) |

> O campo antigo `horas_dedicadas` do MVP **deixa de existir** na tabela. Seu valor é migrado como uma sessão manual em `SessoesEstudo` (Seção 2.6).

#### `SessoesEstudo`
**NOVA.** Cada intervalo de tempo efetivamente estudado em uma tarefa. O **tempo real** de uma tarefa é a soma de suas sessões.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_sessao | BIGINT IDENTITY(1,1) | Não | PK | Identificador |
| id_tarefa | INT | Não | FK → Tarefas, ON DELETE CASCADE | Tarefa estudada |
| id_usuario | INT | Não | FK → Usuarios, NO ACTION | Dono da sessão (evita cascata múltipla; ver Seção 2.2) |
| inicio | DATETIME2(0) | Não | | Início (UTC) |
| fim | DATETIME2(0) | Sim | CHECK (fim IS NULL OR fim > inicio) | Fim (UTC). **NULL = cronômetro em andamento** |
| duracao_seg | INT, coluna **calculada persistida** | Sim | `DATEDIFF(SECOND, inicio, fim)` | Duração em segundos. NULL enquanto em andamento |
| origem | NVARCHAR(12) | Não | CK IN ('Cronometro','Manual') | Como foi registrada |
| observacao | NVARCHAR(300) | Sim | | Nota livre |
| criado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Registro (UTC) |

Regras: um usuário só pode ter **uma sessão em andamento** (`fim IS NULL`) por vez, garantido por índice único filtrado (Seção 2.4). Sessões manuais são sempre gravadas com `inicio` + `fim` (o fim é calculado a partir da duração informada).

#### `HistoricoAtividades`
**NOVA.** Registro de eventos para o relatório semanal ("tudo o que foi feito, adicionado..."). Guarda *snapshots* de texto, para que o histórico sobreviva à exclusão de tarefas e disciplinas.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_atividade | BIGINT IDENTITY(1,1) | Não | PK | Identificador |
| id_usuario | INT | Não | FK → Usuarios, NO ACTION | Autor do evento |
| tipo | NVARCHAR(30) | Não | CK IN ('TAREFA_CRIADA','TAREFA_CONCLUIDA','TAREFA_REABERTA','TAREFA_EDITADA','TAREFA_EXCLUIDA','DISCIPLINA_CRIADA','DISCIPLINA_EDITADA','DISCIPLINA_EXCLUIDA','SESSAO_REGISTRADA') | Tipo do evento |
| id_entidade | INT | Sim | sem FK | Id da tarefa/disciplina no momento do evento |
| nome_disciplina | NVARCHAR(120) | Sim | | Snapshot do nome da disciplina |
| descricao | NVARCHAR(300) | Não | | Texto legível (ex.: "Tarefa 'Lista 3' concluída") |
| criado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Momento (UTC) |

O **backend Node** grava um registro nesta tabela a cada operação correspondente (criar, concluir, reabrir, editar, excluir tarefa/disciplina; registrar sessão), na **mesma transação** da operação.

#### `InsightCache`
**NOVA.** Evita recalcular e chamar a API de LLM a cada abertura do Dashboard.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| id_cache | INT IDENTITY(1,1) | Não | PK | Identificador |
| id_usuario | INT | Não | UQ, FK → Usuarios, ON DELETE CASCADE | Um cache por usuário |
| hash_entrada | CHAR(64) | Não | | SHA-256 das métricas de entrada. Se mudar, o cache é invalidado |
| payload_json | NVARCHAR(MAX) | Não | CHECK (ISJSON(payload_json) = 1) | Resposta completa de insights |
| gerado_em | DATETIME2(0) | Não | DEFAULT SYSUTCDATETIME() | Geração (UTC) |
| expira_em | DATETIME2(0) | Não | | Validade (6 horas) |

### 2.4 Índices

| Índice | Tabela | Colunas | Observação |
|---|---|---|---|
| IX_Disciplinas_usuario | Disciplinas | (id_usuario) | |
| IX_Tarefas_disciplina_status | Tarefas | (id_disciplina, status) | INCLUDE (data_prevista, horas_estimadas, concluida_em) |
| IX_Tarefas_data_prevista | Tarefas | (data_prevista) | filtros e ordenação por prazo |
| IX_Tarefas_criado_em | Tarefas | (criado_em) | relatório semanal |
| IX_Sessoes_tarefa | SessoesEstudo | (id_tarefa) | INCLUDE (inicio, fim, duracao_seg) |
| IX_Sessoes_usuario_inicio | SessoesEstudo | (id_usuario, inicio) | métricas por semana |
| UX_Sessoes_ativa_por_usuario | SessoesEstudo | (id_usuario) **WHERE fim IS NULL**, único | garante um cronômetro ativo por usuário |
| IX_Historico_usuario_data | HistoricoAtividades | (id_usuario, criado_em DESC) | relatório |
| IX_RefreshTokens_usuario | RefreshTokens | (id_usuario, expira_em) | revogação em massa e limpeza de expirados |

### 2.5 Views

- **`vw_TarefaTempo`**: por tarefa, retorna `id_tarefa`, `id_disciplina`, `horas_estimadas`, `horas_reais` (soma de `duracao_seg`/3600 das sessões finalizadas), `desvio_pct` = `(horas_reais - horas_estimadas) / horas_estimadas * 100` (NULL se não houver estimativa ou sessões) e `atrasada` (`status='Pendente' AND data_prevista < CAST(GETDATE() AS DATE)`).
- **`vw_ProgressoDisciplina`**: por disciplina, total de tarefas, concluídas, pendentes, atrasadas, horas estimadas totais/concluídas, horas reais, progresso simples (%) e progresso ponderado por horas estimadas (%).
- **`vw_HorasPorSemana`**: por usuário e semana ISO (segunda a domingo, no fuso America/Sao_Paulo), horas estudadas e tarefas concluídas.

### 2.6 Migração e Seeds

1. **Scripts SQL versionados** em `database/`, numerados e idempotentes (podem ser rodados mais de uma vez sem erro):
   - `01_create_database.sql`: cria banco e logins
   - `02_schema.sql`: tabelas, constraints
   - `03_indexes.sql`
   - `04_views.sql`
   - `05_seed_cursos.sql`
   - `06_seed_demo.sql`
2. **Script de migração `database/migrate_from_sqlite.js`** (Node): lê o arquivo SQLite do MVP e copia usuários, disciplinas e tarefas para o SQL Server, preservando os relacionamentos.
   - Hashes bcrypt existentes são copiados sem alteração. Se as senhas do MVP não estiverem com hash, o script deve aplicar bcrypt durante a migração.
   - O antigo `horas_dedicadas > 0` de uma tarefa vira **uma sessão `Manual`** com a duração correspondente, posicionada na data de conclusão (ou de criação, se pendente).
   - Ao final, imprimir relatório de contagens (origem vs. destino).
3. **Seed de demonstração** (`06_seed_demo.sql`): manter o usuário `aluno@edutrack.ai` (senha `123456`, com hash bcrypt) e popular **pelo menos 6 semanas de histórico realista**: 5 disciplinas de TI (incluindo Python e Banco de Dados), 8 a 12 tarefas por disciplina, `horas_estimadas` preenchidas, sessões distribuídas por vários dias, **algumas disciplinas com desvio acima de +30%** (para o insight de exemplo funcionar), uma disciplina em risco de atraso, tarefas atrasadas e tarefas com prazo nos próximos 7 dias. Os gráficos e a previsão precisam fazer sentido logo na primeira execução.
4. Remover a dependência `sqlite3` do backend após a migração validada.
5. **Massa de dados para teste de carga** (`database/seed_loadtest.js`, executado só sob demanda, nunca no setup padrão): gerar **1.200 usuários** fictícios (senha de teste com hash bcrypt), cada um com 5 disciplinas, cerca de 10 tarefas por disciplina e sessões de estudo distribuídas em 8 semanas (≈ 60.000 tarefas e ≈ 150.000 sessões no total). Deve ser rápido (inserção em lote) e removível (`--limpar`). Usado na validação de desempenho (Seção 10.2).

### 2.7 Entregáveis da Fase de Banco

- Scripts em `database/` (acima)
- `docs/DICIONARIO_DADOS.md` (este dicionário, atualizado conforme o DDL final)
- `docs/DER.md` com diagrama entidade-relacionamento em **Mermaid** (`erDiagram`)
- `docs/SETUP_SQLSERVER.md` com o passo a passo da Seção 2.1
- Camada de acesso no Node em `backend/src/db/` (pool de conexões `mssql`, helper de transação, tratamento de erros)

---

## 3. Registro de Tempo Real (cronômetro + ajuste manual)

Pré-requisito dos itens 2, 4 e 5.

### 3.1 Comportamento

- **Campo "Tempo estimado (horas)"** no formulário de criar/editar tarefa (opcional, aceita decimais, ex.: 1,5). Tarefas sem estimativa continuam válidas, mas são sinalizadas ("sem estimativa") e tratadas como descrito na Seção 4.
- **Cronômetro por tarefa**: botão Iniciar/Pausar dentro de cada tarefa (na lista de Tarefas Gerais e no modal de detalhes da disciplina).
  - Iniciar cria uma sessão com `fim = NULL`. Pausar preenche `fim`. Retomar cria uma nova sessão.
  - Só **um cronômetro ativo por usuário**. Se o aluno iniciar outro, o anterior é **pausado automaticamente** (na mesma transação) e a interface avisa isso.
  - **Indicador global**: enquanto houver cronômetro ativo, mostrar na Sidebar (ou cabeçalho) um mini-widget com o nome da tarefa e o tempo decorrido (atualizado a cada segundo no cliente), com botão de pausar.
  - Ao abrir o app, o frontend consulta a sessão ativa e continua a contagem a partir do `inicio` (sobrevive a recarregar a página e fechar o navegador).
  - Se uma sessão ativa tiver mais de **12 horas**, ao abrir o app exibir um aviso pedindo para o aluno **ajustar o horário de término** (provável esquecimento).
- **Ajuste manual**: no detalhe da tarefa, seção "Tempo registrado" com lista das sessões (data, duração, origem, observação), com ações de **adicionar sessão manual** (data, hora de início, duração, observação), **editar** e **excluir** sessões.
- No detalhe da tarefa mostrar: Estimado, Real e Desvio (%), com cor: verde (≤ +10%), amarelo (+10% a +30%), vermelho (> +30%).
- Concluir uma tarefa **com cronômetro ativo nela** pausa a sessão automaticamente.
- **Mobile:** o mini-widget do cronômetro fica **fixo acima da barra de navegação inferior** (Seção 10.3), com botão de pausar com alvo de toque ≥ 44 px. Anúncio a leitores de tela apenas ao iniciar/pausar, nunca a cada segundo (Seção 10.5).

### 3.2 Endpoints (Node)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/tarefas/:id/sessoes/iniciar` | Inicia cronômetro (pausa o anterior, se houver). Retorna a sessão ativa |
| POST | `/api/sessoes/:id/pausar` | Finaliza a sessão ativa |
| GET | `/api/sessoes/ativa` | Sessão em andamento do usuário (ou `null`) |
| GET | `/api/tarefas/:id/sessoes` | Lista de sessões da tarefa + totais |
| POST | `/api/tarefas/:id/sessoes` | Cria sessão manual |
| PUT | `/api/sessoes/:id` | Edita sessão |
| DELETE | `/api/sessoes/:id` | Exclui sessão |

Validações: sessão não pode ficar no futuro; duração manual entre 1 minuto e 24 horas; usuário só acessa suas próprias sessões (verificar `id_usuario` em toda rota).

---

## 4. Cálculo Avançado de Progresso (item 2) - Microsserviço Python

### 4.1 Estrutura do serviço

```
analytics-service/
├── app/
│   ├── main.py              # FastAPI app, rotas, middleware de chave interna
│   ├── config.py            # leitura do .env (pydantic-settings)
│   ├── db.py                # engine SQLAlchemy + pyodbc, somente leitura
│   ├── security.py          # valida X-Internal-Key
│   ├── metrics/
│   │   ├── progress.py      # progresso simples e ponderado
│   │   ├── forecast.py      # velocidade e previsão de conclusão
│   │   └── time_tracking.py # estimado vs. real
│   ├── insights/            # Seção 5
│   └── reports/             # Seção 7
├── tests/
├── requirements.txt
└── .env.example
```

Dependências: `fastapi`, `uvicorn`, `sqlalchemy`, `pyodbc`, `pandas`, `numpy`, `pydantic`, `pydantic-settings`, `httpx`, `google-genai` (SDK oficial do Gemini), `matplotlib`, `reportlab`, `python-dotenv`, `pytest`. Documentação automática do FastAPI em `/docs`.

### 4.2 Endpoints do serviço Python

Todos exigem o cabeçalho `X-Internal-Key`. Retornam **JSON** (exceto o relatório, que retorna PDF).

| Método | Rota | Retorno |
|---|---|---|
| GET | `/v1/health` | Status do serviço e do banco |
| GET | `/v1/usuarios/{id_usuario}/metricas` | Métricas do Dashboard (Seção 4.3) |
| GET | `/v1/usuarios/{id_usuario}/insights?modo=regras\|ia` | Insights (Seção 5). `regras` responde em milissegundos; `ia` enriquece os textos com o Gemini (mais lento) |
| POST | `/v1/relatorios` (corpo: `id_usuario`, `semana_inicio`) | Cria o job de geração do PDF. Responde `202` com `id_job` (Seção 7.1) |
| GET | `/v1/relatorios/{id_job}?id_usuario=` | Status do job: `na_fila`, `gerando`, `pronto` ou `erro` |
| GET | `/v1/relatorios/{id_job}/arquivo?id_usuario=` | PDF pronto. Só o dono do job acessa (Seção 7) |

O Node expõe `GET /api/dashboard/metricas` e repassa a resposta (após validar JWT). Se o serviço Python estiver fora do ar, o Node responde `503` com mensagem clara, e o Dashboard mostra o restante normalmente, com os blocos avançados em estado "indisponível no momento" (sem tela quebrada).

**Desempenho (Seção 10.2):** as métricas devem ser calculadas com **agregações em SQL** (`GROUP BY`, views da Seção 2.5), sem carregar tabelas inteiras em memória. O Node mantém um **cache em memória** de `GET /api/dashboard/metricas` por usuário (TTL de 60 s), **invalidado em qualquer escrita desse usuário** (tarefa, disciplina ou sessão). Timeout do Node para o Python nas métricas e nos insights por regras: **3 s**.

### 4.3 Definições das métricas

Considere "hoje" no fuso `America/Sao_Paulo`.

**a) Peso de uma tarefa**
- Se tem `horas_estimadas`: o peso é esse valor.
- Se não tem: o peso é a **mediana** das estimativas das tarefas da mesma disciplina; se nenhuma tiver estimativa, peso = 1.
- Retornar, por disciplina, `tarefas_sem_estimativa` (quantidade) e usar isso para reduzir a confiança (4.3 e).

**b) Progresso por disciplina**
- `progresso_simples` = tarefas concluídas ÷ total de tarefas.
- `progresso_ponderado` = Σ peso das concluídas ÷ Σ peso de todas as tarefas.
- Disciplina sem tarefas: progresso 0 e flag `sem_tarefas = true`.

**c) Progresso geral ponderado por carga horária**
- `progresso_geral` = Σ (`carga_horaria` × `progresso_ponderado`) ÷ Σ `carga_horaria`, considerando disciplinas ativas (com `data_fim` ≥ hoje ou com tarefas pendentes).
- Exemplo de verificação: Disciplina A (carga 80 h, ponderado 50%) e B (carga 40 h, ponderado 20%) → (80×0,5 + 40×0,2) ÷ 120 = **40%**. (O simples dá 35%.)

**d) Velocidade atual**
- Janela das **últimas 4 semanas completas + a semana corrente parcial desconsiderada**.
- `velocidade_horas_semana` = média ponderada das horas de **trabalho concluído** (Σ peso das tarefas concluídas em cada semana, via `concluida_em`), com pesos 4, 3, 2, 1 (semana mais recente = 4).
- `velocidade_tarefas_semana` calculada do mesmo modo, por contagem.

**e) Previsão de conclusão (por disciplina e geral)**
- `fator_ajuste` = Σ horas reais ÷ Σ horas estimadas, usando só tarefas **concluídas que tenham estimativa e sessões**. Limitar entre 0,5 e 3,0. Sem dados suficientes (menos de 3 tarefas), usar 1,0.
- `trabalho_restante_h` = Σ peso das tarefas pendentes × `fator_ajuste`.
- `semanas_restantes` = `trabalho_restante_h` ÷ `velocidade_horas_semana`.
- `data_prevista_conclusao` = hoje + `semanas_restantes` × 7 dias.
- `folga_dias` = `data_fim` da disciplina − `data_prevista_conclusao` (negativo = previsão depois do prazo).
- `situacao_previsao`:
  - `concluida` (sem pendentes)
  - `no_prazo` (folga ≥ 0)
  - `em_risco` (folga entre −7 e −1)
  - `atrasada` (folga < −7 ou `data_fim` já passou com pendências)
  - `sem_dados` (velocidade = 0 ou menos de 2 semanas de histórico)
- `confianca`: `alta` (≥ 4 semanas de histórico, ≥ 8 tarefas concluídas, < 25% sem estimativa), `media` (≥ 2 semanas e ≥ 4 tarefas), `baixa` nos demais casos. A UI exibe a confiança junto da previsão.
- Exemplo de verificação: pendentes somam 10 h, `fator_ajuste` 1,2 → restante 12 h; velocidade 5 h/semana → 2,4 semanas → conclusão em ~17 dias.

**f) Estimado vs. Real**
- Por disciplina: `horas_estimadas_total` e `horas_reais_total` (somente tarefas concluídas que tenham os dois), `desvio_pct`.
- Por semana (últimas 8): horas reais estudadas e meta semanal do usuário (`meta_semanal_horas`).

**g) Outras métricas**
- `horas_semana_atual` e `percentual_meta_semanal`.
- `sequencia_dias` (dias consecutivos com pelo menos uma sessão registrada).
- Contagens gerais: tarefas pendentes, concluídas, atrasadas, vencendo em ≤ 7 dias.

### 4.4 Exemplo de resposta de `/metricas` (formato esperado)

```json
{
  "gerado_em": "2026-10-03T14:20:00-03:00",
  "geral": {
    "progresso_geral_ponderado_pct": 41.3,
    "progresso_geral_simples_pct": 38.0,
    "velocidade_horas_semana": 6.4,
    "velocidade_tarefas_semana": 3.1,
    "horas_semana_atual": 4.5,
    "meta_semanal_horas": 10,
    "percentual_meta_semanal": 45.0,
    "sequencia_dias": 3,
    "tarefas": { "pendentes": 21, "concluidas": 34, "atrasadas": 2, "vencendo_7_dias": 5 }
  },
  "disciplinas": [
    {
      "id_disciplina": 3,
      "nome": "Programação em Python",
      "carga_horaria": 80,
      "progresso_simples_pct": 40.0,
      "progresso_ponderado_pct": 47.5,
      "horas_estimadas_total": 18.0,
      "horas_reais_total": 23.4,
      "desvio_pct": 30.0,
      "fator_ajuste": 1.3,
      "trabalho_restante_h": 14.3,
      "data_prevista_conclusao": "2026-11-20",
      "data_fim": "2026-11-30",
      "folga_dias": 10,
      "situacao_previsao": "no_prazo",
      "confianca": "media",
      "tarefas_sem_estimativa": 2
    }
  ],
  "evolucao_semanal": [
    { "semana_inicio": "2026-08-24", "horas_reais": 7.5, "tarefas_concluidas": 4, "meta_horas": 10 }
  ]
}
```

### 4.5 Exibição no Dashboard (área principal)

Manter tudo que já existe no Dashboard (cards de métricas, gráfico de horas por disciplina, distribuição de tarefas, progresso por disciplina, Insights) e **adicionar**:

1. **Card "Progresso Geral Ponderado"** (destaque): percentual grande, com texto de apoio mostrando a diferença para o progresso simples ("ponderado pela carga horária").
2. **Card "Velocidade e Meta Semanal"**: horas estudadas na semana vs. meta (barra de progresso), velocidade média e sequência de dias.
3. **Tabela/cards "Previsão de Conclusão por Disciplina"**: nome, progresso ponderado, data prevista, data de término, folga em dias, badge de situação (`No prazo` verde, `Em risco` amarelo `#C8B755`, `Atrasada` vermelho, `Sem dados` cinza) e selo de confiança. Tooltip explicando como a previsão foi calculada.
4. **Gráfico "Estimado vs. Real por disciplina"**: barras agrupadas (Recharts), com o desvio % em rótulo.
5. **Gráfico "Evolução semanal"**: linha das horas reais das últimas 8 semanas com a linha tracejada da meta.
6. **Botão "Gerar relatório semanal"** (Seção 7).

Estados obrigatórios: carregamento (skeleton), vazio (ex.: "Registre algumas sessões de estudo para ver sua previsão") e erro/indisponível.

---

## 5. Insights com IA (item 4)

### 5.1 Princípio de funcionamento (modelo híbrido)

1. O **Python calcula os fatos** (regras e estatística) e produz uma lista de insights estruturados. Isso é a **base** e funciona sempre, sem internet.
2. A **IA principal é o Gemini (Google)**, acessado pela API do Gemini, que reescreve cada insight de forma natural e personalizada. A IA **não calcula nada**: só redige a partir dos números já calculados.
3. Se o Gemini estiver desligado, sem chave, lento, com erro, ou se o aluno tiver desativado a IA (`ia_habilitada = 0`), o sistema usa os **textos-modelo por regra** (fallback), e o insight é marcado com `fonte: "regra"` (em vez de `"ia"`). O Dashboard nunca fica sem insights.
4. **Resposta rápida (< 2 s):** `GET /api/insights` **nunca espera o Gemini**. Ele devolve na hora os insights por regra (ou o cache, se houver) com `status_ia: "processando"`, e o enriquecimento pela IA roda em segundo plano e é gravado no cache. O frontend consulta de novo após alguns segundos e troca os textos suavemente (Seção 5.6).

### 5.2 Configuração (`.env` do analytics-service)

```
LLM_PROVIDER=gemini        # gemini (padrão) | none (somente regras)
LLM_API_KEY=               # chave da API do Gemini (Google AI Studio ou Vertex AI, conforme o acesso da parceria Google Academy/Impacta)
LLM_MODEL=                 # modelo do Gemini; preferir a família "Flash" (menor latência e custo). Confira o nome vigente na documentação do Gemini e NÃO fixe no código
LLM_TIMEOUT_SECONDS=20     # a chamada roda em segundo plano, então pode ser mais longa
LLM_MAX_INSIGHTS=6
```

Usar o SDK oficial `google-genai` e a **saída estruturada em JSON** do Gemini. Manter a interface `LLMClient` com o adaptador do Gemini como implementação principal, de modo que trocar de provedor no futuro seja só criar outro adaptador. Com `LLM_PROVIDER=none`, tudo roda só por regras.

### 5.3 Regras de geração (insights base)

Cada regra só dispara se houver dados suficientes (mínimo **3 tarefas concluídas com sessões** na disciplina para regras de desvio).

| Código | Condição | Severidade | Exemplo de texto (fallback) |
|---|---|---|---|
| `DESVIO_ALTO` | Desvio real vs. estimado da disciplina > +20% | `warning` (> +20%) / `critical` (> +50%) | "Você está levando 30% a mais de tempo em Programação em Python do que o planejado. Reorganize seu cronograma: reserve mais tempo por tarefa ou revise suas estimativas." |
| `DESVIO_BAIXO` | Desvio < −20% | `success` | "Você está concluindo Banco de Dados 25% mais rápido que o estimado. Suas estimativas podem estar altas; ajustá-las libera tempo na agenda." |
| `PREVISAO_RISCO` | `situacao_previsao` = `em_risco` ou `atrasada` | `warning` / `critical` | "No ritmo atual, você deve concluir Redes em 12/12, 9 dias depois do término. Considere aumentar a dedicação semanal em cerca de X horas." |
| `PRAZO_PROXIMO` | Tarefas pendentes com prazo em ≤ 7 dias | `warning` | "3 tarefas vencem nos próximos 7 dias. Priorize 'Lista 3' (Estruturas de Dados), que ainda não teve nenhum tempo registrado." |
| `ATRASADAS` | Existem tarefas atrasadas | `critical` | "Você tem 2 tarefas atrasadas. Que tal reservar um bloco de 1h hoje para resolver a mais antiga?" |
| `META_SEMANAL` | Horas da semana < proporção esperada da meta até o dia atual | `info` / `warning` | "Você estudou 4,5 h de 10 h da meta. Faltam 5,5 h: cerca de 1,4 h por dia até domingo." |
| `DESEQUILIBRIO` | Uma disciplina concentra > 50% das horas das últimas 2 semanas enquanto outra com pendências próximas do prazo tem < 10% | `warning` | "Mais da metade do seu tempo foi para Python, enquanto Redes (prova em 6 dias) recebeu pouco." |
| `SEM_ESTIMATIVA` | > 30% das tarefas pendentes sem `horas_estimadas` | `info` | "Estimar o tempo das tarefas melhora a precisão das previsões e das recomendações." |
| `SEQUENCIA` | Sequência ≥ 3 dias | `success` | "3 dias seguidos estudando. Mantenha o ritmo." |

O cálculo da sugestão "aumentar X horas por semana" deve ser: `trabalho_restante_h ÷ semanas_até_data_fim − velocidade_horas_semana` (mínimo 0, arredondado para 0,5).

**Priorização:** ordenar por severidade (`critical` > `warning` > `info` > `success`), depois por proximidade de prazo. Retornar no máximo `LLM_MAX_INSIGHTS` (6) insights, sem repetir o mesmo `codigo` + disciplina.

### 5.4 Uso do LLM (quando habilitado)

- **Entrada enviada ao LLM**: apenas métricas agregadas e nomes de disciplinas/tarefas. **Nunca** enviar e-mail, telefone, sobrenome, senha ou qualquer dado pessoal (no máximo o primeiro nome).
- Uma **única chamada** para todos os insights, pedindo **JSON** estrito com um `texto` por insight.
- Regras no prompt: português do Brasil; tom motivador, direto e respeitoso; no máximo 2 frases por insight; **usar exclusivamente os números fornecidos (proibido inventar valores)**; terminar com uma ação concreta; sem culpabilizar o aluno.
- **Validação da resposta**: se o JSON for inválido, faltar insight, ou o texto citar números que não estejam nas métricas enviadas, **descartar e usar o fallback** daquele insight.
- Timeout de `LLM_TIMEOUT_SECONDS`; em falha, fallback sem erro visível para o usuário.
- **Privacidade:** a tela de Perfil informa, em linguagem simples, que resumos agregados dos estudos podem ser processados pelo Gemini para gerar recomendações, e traz o interruptor **"Usar IA nas recomendações"** (`ia_habilitada`). Desativado, nada é enviado ao Gemini.

### 5.5 Formato da resposta de `/insights`

```json
{
  "gerado_em": "2026-10-03T14:20:00-03:00",
  "fonte_predominante": "ia",
  "status_ia": "pronto",
  "insights": [
    {
      "id": "DESVIO_ALTO:3",
      "codigo": "DESVIO_ALTO",
      "severidade": "warning",
      "id_disciplina": 3,
      "disciplina": "Programação em Python",
      "titulo": "Python está levando mais tempo que o planejado",
      "texto": "Você está levando 30% a mais de tempo em Programação em Python do que o planejado. Reorganize seu cronograma reservando mais tempo por tarefa.",
      "fonte": "ia",
      "metricas": { "desvio_pct": 30.0, "horas_estimadas": 18.0, "horas_reais": 23.4 },
      "acao_sugerida": { "tipo": "abrir_disciplina", "id_disciplina": 3 }
    }
  ]
}
```

`status_ia` pode ser `pronto`, `processando`, `desativada` (aluno desligou a IA ou `LLM_PROVIDER=none`) ou `indisponivel` (falha do Gemini; textos por regra).

### 5.6 Cache e rota no Node

- `GET /api/insights` (sempre em < 2 s):
  1. O Node calcula o `hash_entrada` (hash das métricas atuais) e consulta `InsightCache`. Cache válido (não expirado e mesmo hash): devolve com `status_ia: "pronto"`.
  2. Sem cache válido: chama o Python com `modo=regras` (resposta em milissegundos), **devolve imediatamente** com `status_ia: "processando"` (ou `desativada`, se a IA estiver desligada) e **dispara em segundo plano** a chamada `modo=ia`. Ao terminar, grava o resultado em `InsightCache`.
  3. Travar duplicidade: no máximo **um job de IA por usuário** ao mesmo tempo (trava em memória) e limite global de jobs simultâneos.
  4. O frontend, ao receber `processando`, consulta `GET /api/insights` a cada 3 s, no máximo 5 vezes, e atualiza os cartões quando vier `pronto`.
- Parâmetro `?forcar=true` ignora o cache (botão "Atualizar insights"), com limite de uma chamada por minuto por usuário.
- Cache expira em 6 horas.

### 5.7 Exibição no Dashboard

- Substituir/evoluir o bloco "Insights IA" atual por cartões com **ícone e cor por severidade** (usando a paleta do projeto), título, texto e botão da ação sugerida (ex.: "Ver disciplina" abre a disciplina).
- Selo discreto "Gerado por IA" ou "Gerado por regras" conforme `fonte`.
- Botão "Atualizar insights" e indicação de "atualizado há X minutos".
- Estado vazio amigável quando não houver dados suficientes ("Registre o tempo das suas tarefas para receber recomendações personalizadas").

---

## 6. Busca e Filtros Avançados (item 3)

A aba **Tarefas Gerais** já entrega: busca textual, filtro por disciplina, por status e por situação de prazo, ordenação por prazo com desempate A-Z, abas "Todas" e "Próximas", e modal de detalhes. **Manter tudo isso.** Melhorias a implementar:

### 6.1 Melhorias na aba Tarefas Gerais

1. **Filtro por período de datas** com seletor "De / Até" (data prevista), além dos atalhos atuais (≤ 7 dias etc.). Atalhos rápidos: *Hoje*, *Esta semana*, *Este mês*.
2. **Filtro de status ampliado**: Todos, Pendentes, Concluídas e **Atrasadas** (derivado).
3. **Filtro por disciplina com seleção múltipla.**
4. **Novos filtros de tempo**: *Sem estimativa*, *Com tempo registrado*, *Estourou a estimativa* (real > estimado). Aproveitam os dados da Seção 3.
5. **Chips de filtros ativos** abaixo da barra, cada um removível, e botão **"Limpar filtros"**.
6. **Filtros persistentes na URL** (query string), para poder recarregar a página ou compartilhar a visão sem perder os filtros.
7. **Busca com debounce (300 ms)**, destaque do termo encontrado nos resultados e contador "N tarefas encontradas".
8. **Paginação no servidor** (padrão 20 por página) com seletor de tamanho.
9. **Colunas de tempo na lista**: Estimado, Real e botão de cronômetro (Seção 3).
10. **Estados vazios** diferentes para "nenhuma tarefa cadastrada" e "nenhum resultado para os filtros".
11. **Mobile:** os filtros ficam em um painel recolhível (*bottom sheet*) aberto por um botão "Filtros (N)", com N = filtros ativos, e a lista usa cards em vez de tabela (Seção 10.3). O tamanho máximo de página no servidor é **100**.

### 6.2 Busca global e filtros em Disciplinas

- **Campo de busca global** no topo da área interna (atalho `Ctrl+K` opcional), retornando **tarefas e disciplinas** agrupadas; clicar abre o item.
- Na aba **Disciplinas**: busca por nome/professor, filtro (*Todas*, *Com pendências*, *Em risco de atraso*, *Encerradas*) e ordenação (nome, término mais próximo, menor progresso). O badge de risco usa `situacao_previsao` do serviço Python.

### 6.3 Filtragem no servidor (SQL Server)

Mover a filtragem para o backend:

`GET /api/tarefas?busca=&disciplinas=1,2&status=pendente|concluida|atrasada&prazo=proximas|longe|vencidas|sem_prazo&de=YYYY-MM-DD&ate=YYYY-MM-DD&tempo=sem_estimativa|com_tempo|estourou&ordem=prazo_asc|prazo_desc|az|za|recentes&pagina=1&tamanho=20`

- Resposta: `{ itens: [...], total, pagina, tamanho, contadores: { todas, pendentes, concluidas, atrasadas } }`.
- Todos os filtros são combinados com `AND`, com **parâmetros** (nunca concatenação). `busca` usa `LIKE` sobre título, lembrete e nome da disciplina (escapar `%` e `_`).
- Ordenação padrão: prazo mais próximo primeiro, tarefas sem prazo por último, desempate por título A-Z.
- `GET /api/busca?q=termo` para a busca global (máx. 5 tarefas + 5 disciplinas).

---

## 7. Relatório Semanal em PDF (item 5)

### 7.1 Entrega

- **Botão "Gerar relatório semanal"** no Dashboard (e atalho na Sidebar, opcional) que abre um pequeno seletor: *Semana atual*, *Semana passada* ou *Escolher semana* (seletor de data que ajusta para a segunda-feira). Botão "Gerar PDF" com estado de carregamento; ao concluir, o download inicia automaticamente.
- **Somente sob demanda** (sem agendamento, sem e-mail e sem histórico de relatórios nesta versão).
- **Geração assíncrona** (para que nenhuma chamada passe de 2 s, Seção 10.2):
  1. `POST /api/relatorios/semanal` (corpo: `semana_inicio`) → o Node valida o JWT, cria o job no Python e responde `202` com `id_job`.
  2. O frontend consulta `GET /api/relatorios/semanal/:id_job` a cada 1,5 s (status `na_fila`, `gerando`, `pronto` ou `erro`; desiste após 60 s com mensagem amigável).
  3. Quando `pronto`, `GET /api/relatorios/semanal/:id_job/arquivo` devolve o PDF com `Content-Type: application/pdf` e `Content-Disposition: attachment; filename="EduTrack_Relatorio_2026-09-28_a_2026-10-04.pdf"`.
  4. O job pertence ao usuário que o criou; qualquer outro usuário recebe `404`. O PDF fica em pasta temporária e é apagado após 30 minutos.
- **Concorrência:** no máximo 1 job por usuário e 2 jobs simultâneos no total; excedeu, responder `429` com `Retry-After`. A geração do PDF roda em **processo separado** (process pool), para não travar as demais rotas do Python.
- **Mobile:** após gerar, oferecer **"Abrir"** (visualizador do sistema) e **"Baixar"**, pois alguns navegadores de celular não iniciam download automático.
- Semana = **segunda a domingo**, fuso `America/Sao_Paulo`. Semana corrente é permitida e identificada como "(parcial)".
- Tempo máximo esperado do job (da criação até `pronto`): 10 segundos. Cada requisição HTTP individual segue a meta de < 2 s.

### 7.2 Tecnologia

- **ReportLab** (layout) + **matplotlib** (gráficos renderizados como imagem PNG em alta resolução). Não usar bibliotecas que dependam de GTK/Cairo (problemáticas no Windows).
- Embutir a fonte **Jost** (arquivos `.ttf` em `analytics-service/app/reports/assets/fonts/`) para manter a identidade visual.
- Folha A4, retrato, margens de 18 mm, cabeçalho e rodapé em todas as páginas (nome do relatório, número da página "Página X de Y", "Gerado em dd/mm/aaaa HH:MM").

### 7.3 Conteúdo e ordem das seções

1. **Capa/cabeçalho**: logo/título "EduTrack AI" (fundo `#2C2E4C`, detalhe `#C8B755`), "Relatório Semanal de Estudos", nome completo do aluno, curso, período (ex.: "28/09/2026 a 04/10/2026") e data de geração.
2. **Resumo da semana** (cartões de KPI): tarefas concluídas, tarefas adicionadas, tarefas atrasadas, horas estudadas, % da meta semanal e sequência de dias. Comparar com a semana anterior (▲/▼ e variação).
3. **Tarefas concluídas na semana**: tabela (tarefa, disciplina, data de conclusão, tempo estimado, tempo real, desvio %).
4. **Tarefas adicionadas na semana**: tabela (tarefa, disciplina, prazo, estimativa).
5. **Tarefas atrasadas**: tabela (tarefa, disciplina, prazo, dias de atraso). Critério: pendente ao final da semana com `data_prevista` ≤ último dia da semana. Destaque em vermelho suave.
6. **Estimado vs. Real por disciplina**: tabela (disciplina, horas estimadas, horas reais, desvio %) + **gráfico de barras agrupadas**.
7. **Gráficos**:
   - Horas estudadas por dia da semana (barras, com meta diária média tracejada)
   - Progresso ponderado por disciplina (barras horizontais, 0-100%)
   - Evolução das últimas 6 semanas (linha de horas reais vs. meta)
   - Distribuição das horas por disciplina (rosca)
8. **Insights e recomendações da IA**: os mesmos insights do Dashboard (Seção 5), com ícone de severidade e texto. Indicar no rodapé da seção se foi "gerado por IA" ou "por regras".
9. **Atividades da semana (linha do tempo)**: lista cronológica a partir de `HistoricoAtividades` (criações, conclusões, edições, exclusões e sessões registradas), agrupada por dia. Se passar de 40 eventos, mostrar os 40 mais recentes e informar o total.

### 7.4 Regras de qualidade

- **Semana sem dados**: gerar o PDF mesmo assim, com mensagens de estado vazio ("Nenhuma tarefa concluída nesta semana") e sem gráficos quebrados.
- Tabelas que ultrapassem a página **quebram corretamente** e repetem o cabeçalho.
- Textos longos truncados ou quebrados sem estourar a célula; acentuação correta em todo o documento.
- Cores consistentes com a paleta; contraste legível quando impresso em preto e branco (usar também rótulos/padrões, não só cor).
- As métricas do relatório devem usar **exatamente as mesmas funções** do módulo `metrics/` e `insights/` (um único cálculo, sem duplicar lógica), garantindo consistência entre Dashboard e PDF.

---

## 8. API do Backend Node - Resumo das Mudanças

Manter todas as rotas atuais (auth, disciplinas, tarefas, perfil) com o mesmo contrato. Mudanças:

- `POST/PUT /api/tarefas`: aceitar `horas_estimadas`; ao concluir/reabrir, preencher/limpar `concluida_em` e gravar em `HistoricoAtividades`.
- `PUT /api/perfil`: aceitar `meta_semanal_horas`.
- Novas rotas: sessões (Seção 3.2), `GET /api/tarefas` com filtros (6.3), `GET /api/busca`, `GET /api/dashboard/metricas`, `GET /api/insights`, relatório assíncrono (`POST /api/relatorios/semanal`, `GET .../:id_job`, `GET .../:id_job/arquivo`) e `GET /api/health`.
- Rotas de autenticação (Seção 10.1): `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, além das de cadastro e recuperação de senha já existentes.
- `PUT /api/perfil` também aceita `tema_preferido`, `tamanho_texto` e `ia_habilitada`.
- Autenticação e autorização: **JWT**, conforme a Seção 10.1 (token de acesso curto + refresh token rotativo, senhas com bcrypt, rate limit, isolamento de dados por usuário).
- Erros no formato `{ "erro": "mensagem em português", "codigo": "CODIGO_ESTAVEL" }`.
- Comunicação Node → Python via `fetch`/`axios` com timeout de **3 s** nas chamadas síncronas (métricas, insights por regra, criação/consulta de jobs) e tratamento de falhas (`503`). Chamadas longas (IA e PDF) são sempre jobs assíncronos.

---

## 9. Configuração e Execução

### 9.1 Estrutura final da raiz

```
EDUTRACK_mvpfinal/
├── frontend/
├── backend/
├── analytics-service/
├── database/
├── docs/
├── package.json         # scripts de orquestração
└── README.md            # atualizado
```

### 9.2 Variáveis de ambiente

- `backend/.env.example`: `PORT`, `JWT_SECRET` (mínimo de 32 caracteres aleatórios), `JWT_ACCESS_TTL` (padrão `15m`), `JWT_REFRESH_TTL_DAYS` (padrão `7`), `CORS_ORIGIN`, `DB_POOL_MAX`, `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERT`, `ANALYTICS_URL`, `ANALYTICS_INTERNAL_KEY`.
- `analytics-service/.env.example`: `DB_SERVER`, `DB_NAME`, `DB_USER` (login somente leitura), `DB_PASSWORD`, `INTERNAL_KEY`, `LLM_*` (Seção 5.2), `TZ=America/Sao_Paulo`.

### 9.3 Scripts

- `npm run dev` na raiz sobe **simultaneamente** frontend (Vite), backend (Node) e analytics-service (`uvicorn app.main:app --port 8000 --reload`) com `concurrently`.
- `npm run db:setup` executa os scripts de `database/` na ordem.
- `npm run db:migrate` executa a migração do SQLite (uma vez).
- `npm run test` roda os testes do backend e do Python.
- `npm run test:load` roda o teste de carga da Seção 10.2 (requer o seed de carga).
- O README atualizado deve ter: pré-requisitos (Node, Python 3.11+, SQL Server, ODBC Driver 18), passo a passo de instalação e execução, usuário de teste e como ativar o LLM.

---

## 10. Requisitos Não Funcionais

> Valem para **todas as fases** e têm precedência sobre decisões de implementação do restante do documento.

### 10.1 Segurança: autenticação JWT e dados privados por usuário

**Autenticação com JWT (emitido e validado pelo backend Node):**

- **Token de acesso (access token):** JWT assinado, validade curta (**15 minutos**). Claims: `sub` (= `id_usuario`), `iat`, `exp`, `jti`. Ao validar, **fixar o algoritmo esperado** (rejeitar `none` e qualquer outro). Segredo em `JWT_SECRET` (mínimo de 32 caracteres aleatórios).
- **Refresh token:** valor aleatório de 256 bits, validade de **7 dias**, guardado **apenas como hash SHA-256** na tabela `RefreshTokens`. É enviado em **cookie `httpOnly`, `Secure` (em produção), `SameSite=Lax`**, restrito ao caminho `/api/auth`.
- **Rotação:** a cada `POST /api/auth/refresh`, o refresh token usado é revogado e um novo é emitido na mesma `familia`. Se um token **já revogado** for reapresentado (indício de roubo), **revogar toda a família** e exigir novo login.
- **Frontend:** manter o access token **somente em memória** (nunca em `localStorage`/`sessionStorage`). Ao receber `401`, tentar **uma** renovação silenciosa e repetir a requisição; se falhar, redirecionar ao login. Assim o aluno continua logado no celular por até 7 dias sem digitar a senha.
- **Logout** revoga o refresh token atual. **Troca ou redefinição de senha revoga todos** os refresh tokens do usuário.
- Senhas com **bcrypt (custo ≥ 10)**. Política para novos cadastros: mínimo de 8 caracteres. (A senha de demonstração `123456` só é aceita pelo seed em ambiente de desenvolvimento.)
- Mensagens genéricas em login e recuperação de senha ("e-mail ou senha inválidos"), para não revelar se um e-mail existe.

**Dados privados por usuário (isolamento):**

- O `id_usuario` vem **sempre do JWT (`sub`)**, **nunca** do corpo, da query string ou da URL.
- **Toda** query de leitura, edição ou exclusão restringe pelo dono (ex.: `JOIN Disciplinas d ON ... WHERE d.id_usuario = @id_usuario`). Recurso de outro usuário responde **`404`** (não `403`), para não revelar a existência do ID.
- Um *middleware* global exige autenticação em todas as rotas `/api/**`, com lista explícita de rotas públicas (login, cadastro, refresh, recuperação de senha, health). Rota nova nasce protegida.
- Vale para tudo: disciplinas, tarefas, sessões, histórico, insights, cache, métricas, **jobs e arquivos de relatório** e foto de perfil.
- Foto de perfil: validar tipo (JPEG/PNG/WebP, pelos bytes iniciais do arquivo e não só pela extensão) e tamanho (≤ 2 MB); salvar com nome aleatório.
- *Recomendado, se o tempo permitir (defesa em profundidade):* **Row-Level Security** do SQL Server usando `SESSION_CONTEXT('id_usuario')`.

**Proteções gerais:**

- `helmet` (cabeçalhos de segurança), **CORS restrito** à origem do frontend (`CORS_ORIGIN`) com credenciais, limite de tamanho do corpo das requisições.
- **Validação de entrada com schema** (ex.: `zod` ou `joi`) em todas as rotas; SQL sempre parametrizado.
- **Rate limit:** login 5 tentativas por minuto por IP + e-mail, com bloqueio temporário após 10 falhas seguidas; recuperação de senha e geração de relatório com limites próprios; limite geral de 300 requisições por minuto por usuário.
- Erros ao cliente sem *stack trace*. Logs **sem** senhas, tokens ou e-mails completos.
- Serviço Python acessível só em `127.0.0.1` e com `X-Internal-Key` (Seção 1.2). Segredos só em `.env`, com `.env` no `.gitignore`.

### 10.2 Desempenho e escalabilidade

**Metas:**

- **p95 < 2 s em todas as rotas de API** (e nenhuma passando de 2 s no uso normal), com **1.000+ usuários cadastrados** e **100 usuários ativos simultâneos**. Taxa de erro < 1%.
- Para cumprir isso, operações lentas são **assíncronas**: Insights com IA (Seção 5.6) e relatório em PDF (Seção 7.1). O job do PDF pode levar até 10 s, mas cada requisição HTTP responde em < 2 s.

**Estratégias obrigatórias:**

- **Paginação no servidor** em toda listagem (padrão 20, máximo 100). Sem consultas `N+1`; usar `JOIN` e agregações.
- Índices da Seção 2.4 e *views* da Seção 2.5; métricas via agregação SQL (Seção 4.2).
- **Pool de conexões** (`mssql`, `DB_POOL_MAX` configurável, padrão 20) e no Python via SQLAlchemy.
- **Caches:** métricas por usuário em memória (TTL 60 s, invalidado em escrita) e `InsightCache` (6 h). Os caches são só otimização: o sistema deve funcionar corretamente sem eles.
- Node *stateless* (escala com várias instâncias). Compressão HTTP (`compression`).
- Python: `uvicorn` com 2 a 4 *workers* em produção; PDF em *process pool* separado, com limites de concorrência (Seção 7.1).
- **Frontend:** divisão de código por rota (`React.lazy`), carregamento tardio do Recharts, *skeletons*, sem requisições duplicadas. Meta: JavaScript inicial ≤ 300 KB (gzip).
- **Observabilidade:** log de duração por requisição, com aviso quando passar de 1 s; `GET /api/health` (inclui banco e serviço Python).

**Validação (obrigatória na Fase 7):**

- Teste de carga em `tests/load/` (k6 ou autocannon) usando o seed de 1.200 usuários (Seção 2.6), simulando: login/refresh, Dashboard (métricas), listagem de tarefas com filtros, busca, iniciar/pausar cronômetro, insights (com cache) e criação de job de PDF.
- Resultados (p50, p95, p99, requisições por segundo e taxa de erro) em `docs/RELATORIO_DESEMPENHO.md`, com os gargalos encontrados e corrigidos.

### 10.3 Usabilidade para web e mobile

- **Mobile-first:** projetar a partir de 360 px de largura. Breakpoints: 640, 768, 1024 e 1280 px.
- **Navegação:**
  - Desktop (≥ 1024 px): Sidebar fixa (como hoje).
  - Tablet (768 a 1023 px): Sidebar recolhível.
  - **Celular (< 768 px): barra de navegação inferior** com 4 itens (*Menu Principal*, *Disciplinas*, *Tarefas*, *Perfil*) e cabeçalho superior com avatar e saudação; "Sair" fica no menu do avatar. O mini-widget do cronômetro fica logo acima dessa barra.
- **Toque:** alvos de toque ≥ 44×44 px, espaçamento mínimo de 8 px entre alvos, confirmação em ações destrutivas. **Nada pode depender de *hover***: tooltips viram botão "ⓘ" com popover acionado por toque/teclado (ex.: explicação da previsão).
- **Adaptação de layout:** tabelas viram **cards empilhados** abaixo de 768 px; modais viram **tela cheia ou *bottom sheet*** no celular, com botão de fechar sempre visível; formulários em uma coluna, com botão principal fixo na base quando longos; filtros em *bottom sheet* (Seção 6.1).
- **Campos de formulário otimizados:** `type`, `inputmode` e `autocomplete` corretos (e-mail, telefone, `inputmode="numeric"` e `autocomplete="one-time-code"` nos 5 campos do código, `type="date"` nativo, horas decimais); **fonte ≥ 16 px nos inputs** (evita zoom automático no iOS).
- **Gráficos** responsivos (`ResponsiveContainer`), com legendas abaixo e rótulos reduzidos no celular. Nenhuma tela com rolagem horizontal da página.
- **Feedback:** *skeletons* de carregamento, *toasts*, estados vazios úteis, **atualização otimista** ao concluir tarefa e ao iniciar/pausar o cronômetro (com reversão em caso de erro), mensagens de erro claras em português e aviso "Sem conexão" quando offline (não é necessário modo offline).
- **Teclado:** `Enter` envia formulários, `Esc` fecha modais, ordem de tabulação lógica.
- *Recomendado:* **PWA básico** (manifest, ícones, `theme-color`), permitindo instalar o app na tela inicial do celular (sem modo offline).
- **Ambientes de teste:** viewports 360×640, 390×844, 768×1024, 1366×768 e 1920×1080; Chrome, Edge e Firefox (desktop), Chrome (Android) e Safari (iOS). Metas do Lighthouse em modo mobile: **Desempenho ≥ 80, Acessibilidade ≥ 90, Boas práticas ≥ 90**.

### 10.4 IA principal: Gemini (Google Academy / Impacta)

O **Gemini é a IA principal do projeto**, em dois sentidos:

1. **Em execução (o que o app usa):** o provedor padrão das recomendações é a **API do Gemini**, usada pelo serviço Python (Seção 5), com fallback por regras e opção de desativar (`ia_habilitada`). Observação: o *Gemini Code Assist* é uma ferramenta de desenvolvimento e **não é chamado pelo app**; o app usa a API do Gemini, com chave obtida conforme o acesso da parceria Google Academy/Impacta (Google AI Studio ou Vertex AI). A chave fica em `LLM_API_KEY` no `.env`, nunca no repositório nem no frontend.
2. **No desenvolvimento (como o projeto é construído):** o projeto é desenvolvido com assistência do Gemini (Gemini Code Assist / Antigravity). Por isso o código deve ser **fácil de ser lido e continuado por uma IA**:
   - estrutura de pastas previsível (Seções 4.1 e 9.1), funções pequenas e com nomes descritivos, comentários em português nos trechos não óbvios e testes automatizados;
   - arquivo **`GEMINI.md` na raiz** (contexto do projeto), com: visão geral e arquitetura, como rodar e testar (comandos), convenções (nomes de tabelas e colunas em português, textos em pt-BR), regras de segurança da Seção 10.1 e uma lista curta de "o que não fazer" (ex.: nunca concatenar SQL, nunca ler `id_usuario` do corpo da requisição, nunca guardar token em `localStorage`). Se a ferramenta usada preferir outro nome de arquivo de contexto, manter o mesmo conteúdo;
   - `docs/ARQUITETURA.md` com o diagrama da Seção 1.2 e o fluxo de autenticação.

### 10.5 Acessibilidade: temas claro/escuro e textos legíveis

**Temas:**

- Três opções: **Claro**, **Escuro** e **Automático** (segue o tema do dispositivo via `prefers-color-scheme`; é o padrão).
- **Onde trocar:** seção "Aparência" no Perfil/Configurações + alternador rápido (ícone sol/lua) no cabeçalho. Nas telas de login e cadastro também deve existir o alternador.
- **Persistência:** salvo no banco (`tema_preferido`), para acompanhar o aluno entre dispositivos, e em cache local para aplicar **antes da renderização** (sem "piscar" no tema errado).
- **Implementação:** Tailwind com `darkMode: 'class'` e **design tokens em variáveis CSS**. Nenhum componente (incluindo Recharts, modais, inputs, *toasts* e *skeletons*) pode usar cor fixa.

**Paleta (valores sugeridos; validar com verificador de contraste):**

| Token | Tema claro | Tema escuro |
|---|---|---|
| Fundo da página | `#E7ECEF` | `#16172B` |
| Superfície / cartão | `#FFFFFF` | `#2C2E4C` |
| Texto principal | `#2C2E4C` | `#E7ECEF` |
| Texto secundário | `#4A4D70` | `#B8BED0` |
| Destaque (preenchimento, bordas, ícones) | `#C8B755` | `#C8B755` |
| Destaque como **texto** | `#6B6019` | `#C8B755` |
| Anel de foco | `#2C2E4C` | `#C8B755` |

**Regra importante sobre o dourado:** `#C8B755` sobre fundo claro tem contraste de apenas ~1,7:1 e **não pode ser usado como cor de texto no tema claro**. Nele, o dourado só serve como preenchimento (botões, barras, indicadores) com texto `#2C2E4C` por cima (contraste ~6,5:1). Para texto dourado no tema claro, usar `#6B6019`. No tema escuro o dourado funciona como texto.

**Cores de estado** (sucesso, alerta, erro, informação): definir variantes para cada tema, sempre acompanhadas de **ícone e rótulo**, nunca só de cor (badges, previsão, severidade dos insights, desvio de tempo).

**Textos legíveis:**

- Corpo ≥ **16 px (1 rem)**, texto secundário ≥ 14 px, **nunca abaixo de 12 px**. `line-height` ≈ 1,5. Fonte Jost com *fallback* `sans-serif`. Largura de linha ≤ ~75 caracteres em textos corridos (insights, descrições). Evitar blocos longos em caixa-alta.
- **Tamanho do texto ajustável** no Perfil: Normal, Grande (115%) e Muito grande (130%), persistido em `tamanho_texto`. O layout usa `rem`, e deve suportar **zoom de 200% sem perda de conteúdo ou funcionalidade**.
- **Contraste WCAG 2.1 AA** nos dois temas: 4,5:1 para texto normal, 3:1 para texto grande, ícones, bordas de campos e elementos de gráfico.

**Teclado, leitores de tela e movimento:**

- HTML semântico (`header`, `nav`, `main`), rótulos em todos os campos e botões de ícone (`aria-label`), **foco sempre visível**, *focus trap* em modais.
- `aria-live` para *toasts* e para o cronômetro (anunciar só início e pausa).
- Gráficos com `aria-label` e **alternativa textual** (botão "Ver dados" com tabela).
- Respeitar `prefers-reduced-motion` (sem animações não essenciais) e não usar conteúdo piscante.
- **PDF do relatório:** sempre em tema claro (pensado para impressão), texto ≥ 10 pt, bom contraste, metadados (título, autor, idioma `pt-BR`).
- Verificação com **axe-core ou Lighthouse nos dois temas**, mais um teste manual de navegação só por teclado nas telas principais.

### 10.6 Resiliência e outros

- Queda do Python ou do Gemini não derruba o app (Seções 4.2 e 5.1).
- Banco em UTC e exibição em America/Sao_Paulo.

---

## 11. Testes e Critérios de Aceite

### 11.1 Testes automatizados (obrigatórios)

- **Python (pytest)** com dados de fixture e resultados esperados calculados à mão para: progresso ponderado (inclui os exemplos das Seções 4.3 c e e), velocidade, `fator_ajuste`, previsão e `situacao_previsao`, regras de insight (cada código), fallback do LLM (simular falha, timeout e JSON inválido) e geração do PDF (arquivo válido, não vazio, também com semana sem dados).
- **Node**: testes de integração das rotas novas (sessões, filtros, constraint de cronômetro único, histórico gravado na transação, isolamento entre usuários).
- **Banco**: script que verifica que as constraints e a migração funcionam (contagens origem vs. destino).
- **Segurança (Node)**: login e refresh funcionando; refresh token rotativo; **reuso de refresh token revogado derruba a família**; JWT expirado, adulterado ou com algoritmo `none` é rejeitado; **usuário A não consegue ler, editar nem excluir** disciplinas, tarefas, sessões, insights, métricas e relatórios do usuário B (sempre `404`); rotas novas sem autenticação retornam `401`; rate limit do login.
- **Desempenho**: teste de carga da Seção 10.2.
- **Acessibilidade e mobile**: axe-core ou Lighthouse nos temas claro e escuro, e verificação dos viewports da Seção 10.3.

### 11.2 Critérios de aceite

1. `npm run db:setup` cria um banco funcional do zero; `docs/DICIONARIO_DADOS.md` e `docs/DER.md` correspondem ao schema real.
2. A migração leva os dados do MVP sem perdas, e o login do `aluno@edutrack.ai` continua funcionando.
3. Iniciar e pausar o cronômetro grava sessões; recarregar a página mantém o cronômetro ativo; iniciar outro pausa o anterior; é possível adicionar, editar e excluir sessões manuais.
4. O Dashboard mostra progresso ponderado, previsão por disciplina com situação e confiança, Estimado vs. Real e evolução semanal, com valores coerentes com o seed.
5. Com o seed, aparece um insight no estilo "Você está levando X% a mais de tempo em Python do que o planejado", **com e sem** LLM configurado.
6. Todos os filtros da Seção 6 funcionam combinados, persistem na URL e a paginação é feita no servidor.
7. O botão gera o PDF com **todas as seções da Seção 7.3**, e o arquivo abre corretamente no leitor de PDF, com a fonte Jost e as cores do projeto; semana vazia também gera PDF sem erro.
8. Derrubar o analytics-service não quebra as demais telas (blocos avançados mostram estado indisponível).
9. Nenhuma funcionalidade do MVP regrediu. `npm run build` do frontend conclui sem erros.
10. **Segurança:** todos os testes de isolamento entre usuários passam; o access token não aparece em `localStorage`; o refresh token só existe em cookie `httpOnly`.
11. **Desempenho:** no teste de carga com 1.200 usuários, **p95 < 2 s em todas as rotas** e erro < 1%; `docs/RELATORIO_DESEMPENHO.md` entregue. Insights e PDF respondem imediatamente (`processando` / `202`) e completam em segundo plano.
12. **Mobile:** em 360×640 e 390×844 não há rolagem horizontal; a navegação inferior funciona; tabelas viram cards; modais viram tela cheia; alvos de toque ≥ 44 px; cronômetro utilizável com uma mão.
13. **Temas e legibilidade:** Claro, Escuro e Automático funcionam em todas as telas (inclusive login e gráficos), sem "piscar" ao carregar, e a preferência persiste entre dispositivos; tamanho de texto ajustável; contraste AA nos dois temas (incluindo a regra do dourado); Lighthouse mobile com Acessibilidade ≥ 90.
14. **IA Gemini:** com chave configurada, os insights passam de `fonte: "regra"` para `"ia"` em segundo plano; sem chave, com falha ou com `ia_habilitada = 0`, o sistema segue com textos por regra e nenhum dado é enviado ao Gemini (no caso do opt-out).
15. `GEMINI.md` e `docs/ARQUITETURA.md` entregues.

---

## 12. Plano de Execução por Fases

Execute **uma fase por vez**, valide e só então avance.

| Fase | Entrega | Validação |
|---|---|---|
| **1. Banco SQL Server** | Scripts, dicionário, DER, setup, migração, seeds, `RefreshTokens` e colunas de preferência (Seção 2) | `db:setup` e `db:migrate` rodam; contagens conferem |
| **2. Backend Node no SQL Server** | Camada `db/`, rotas existentes migradas, histórico de atividades, `horas_estimadas`/`concluida_em`, rotas de sessões, `GET /api/tarefas` com filtros e `/api/busca` e **autenticação JWT com refresh rotativo e isolamento de dados por usuário** (Seções 3, 6.3, 8, 10.1) | MVP inteiro funcionando sobre o SQL Server; testes de integração e de segurança |
| **3. Analytics Service: métricas** | FastAPI, `/v1/health`, `/v1/usuarios/{id}/metricas`, testes (Seção 4) | pytest verde; JSON confere com os exemplos |
| **4. Insights** | Regras, adaptador do Gemini, fallback, `/insights` assíncrono (`status_ia`), cache no Node, opt-out de IA (Seção 5) | Resposta imediata por regras; IA em segundo plano; testes de falha do Gemini e com `LLM_PROVIDER=none` |
| **5. Frontend** | Cronômetro e tempo real, Dashboard avançado, insights, filtros avançados e busca global, **temas claro/escuro, tamanho de texto, layout mobile com navegação inferior** (Seções 3, 4.5, 5.7, 6, 10.3, 10.5) | Fluxo manual completo em desktop e celular, nos dois temas; `npm run build` |
| **6. Relatório PDF** | Geração **assíncrona (jobs)** em Python, rotas no Node, botão e seletor de semana (Seção 7) | PDF conferido visualmente, com e sem dados; chamadas < 2 s |
| **7. Fechamento** | `npm run dev` unificado, README, `.env.example`, `GEMINI.md`, **teste de carga com 1.200 usuários**, Lighthouse/axe, revisão de segurança, testes finais (Seções 9 a 11) | Todos os critérios de aceite da Seção 11.2 |

---

## 13. Fora do Escopo desta Versão

- Envio de relatório por e-mail, agendamento automático e histórico de relatórios gerados.
- Perfis de professor/administrador e compartilhamento entre alunos.
- Aplicativo mobile nativo.
- Notificações push.
- Modo offline completo (há apenas o aviso de falta de conexão).
- Hospedagem em nuvem (a versão é para execução local no Windows).
