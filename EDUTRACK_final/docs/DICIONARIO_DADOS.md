# Dicionário de Dados - EduTrack AI v2

Este documento descreve a modelagem física e as regras de integridade do banco de dados relacional **EduTrackAI** no **Microsoft SQL Server**.

---

## 1. Convenções de Nomenclatura e Tipos

- **Tabelas**: PascalCase no plural (`Usuarios`, `Disciplinas`, `Tarefas`).
- **Colunas**: snake_case minúsculo (`id_usuario`, `data_prevista`, `horas_estimadas`).
- **Chaves Primárias**: `id_<entidade>` com `INT IDENTITY(1,1)` ou `BIGINT IDENTITY(1,1)` para alto volume.
- **Datas/Horas de Auditoria**: `DATETIME2(0)` em UTC (`SYSUTCDATETIME()`).
- **Datas de Negócio**: `DATE` (`data_inicio`, `data_fim`, `data_prevista`).
- **Strings**: `NVARCHAR` com suporte a caracteres acentuados UTF-16 / Unicode.
- **Constraints**: Nomenclatura padronizada explícita (`PK_`, `FK_`, `UQ_`, `CK_`, `DF_`, `IX_`, `UX_`).

---

## 2. Tabelas

### 2.1 `Cursos`
Armazena os cursos de graduação disponíveis para seleção no cadastro do estudante.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_curso` | `INT IDENTITY(1,1)` | Não | `PK_Cursos` | Identificador único do curso |
| `nome` | `NVARCHAR(100)` | Não | `UQ_Cursos_nome` | Nome do curso (ex.: Ciência da Computação) |

### 2.2 `Usuarios`
Contas de estudantes registradas na plataforma.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_usuario` | `INT IDENTITY(1,1)` | Não | `PK_Usuarios` | Identificador único do usuário |
| `nome` | `NVARCHAR(60)` | Não | | Primeiro nome do aluno |
| `sobrenome` | `NVARCHAR(100)` | Não | | Sobrenome do aluno |
| `email` | `NVARCHAR(254)` | Não | `UQ_Usuarios_email` | E-mail corporativo/acadêmico (em minúsculas) |
| `senha_hash` | `NVARCHAR(255)` | Não | | Hash criptográfico bcrypt da senha |
| `telefone` | `NVARCHAR(20)` | Sim | | Telefone/WhatsApp de contato |
| `id_curso` | `INT` | Não | `FK_Usuarios_Cursos` | Referência ao curso matriculado |
| `foto_perfil` | `NVARCHAR(500)` | Sim | | Caminho do arquivo de avatar ou imagem |
| `meta_semanal_horas` | `DECIMAL(5,2)` | Não | `DF: 10`, `CK: [0, 168]` | Meta semanal de dedicação a estudos (horas) |
| `tema_preferido` | `NVARCHAR(10)` | Não | `DF: 'sistema'`, `CK: 'claro','escuro','sistema'` | Tema visual preferido |
| `tamanho_texto` | `NVARCHAR(12)` | Não | `DF: 'normal'`, `CK: 'normal','grande','muito_grande'` | Escala de texto (100%, 115%, 130%) |
| `ia_habilitada` | `BIT` | Não | `DF: 1` | Indicador de autorização para processamento com LLM Gemini |
| `ativo` | `BIT` | Não | `DF: 1` | Flag de ativação da conta |
| `criado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Data de criação do registro em UTC |
| `atualizado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Data da última alteração em UTC |

### 2.3 `RecuperacaoSenha`
Tokens de fluxo de redefinição de senha em três etapas.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_recuperacao` | `INT IDENTITY(1,1)` | Não | `PK_RecuperacaoSenha` | Identificador do registro |
| `id_usuario` | `INT` | Não | `FK → Usuarios (CASCADE)` | Usuário solicitante |
| `codigo_hash` | `NVARCHAR(255)` | Não | | Hash SHA-256 ou bcrypt do código de 5 dígitos |
| `expira_em` | `DATETIME2(0)` | Não | | Validade limite (15 minutos) |
| `tentativas` | `TINYINT` | Não | `DF: 0`, `CK: <= 5` | Contador de tentativas de validação |
| `usado` | `BIT` | Não | `DF: 0` | Flag indicando se o código já foi consumido |
| `criado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Criação da solicitação |

### 2.4 `RefreshTokens`
Controle de sessões persistentes via JWT refresh tokens com rotação e família.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_refresh` | `BIGINT IDENTITY(1,1)` | Não | `PK_RefreshTokens` | Identificador da sessão |
| `id_usuario` | `INT` | Não | `FK → Usuarios (CASCADE)` | Usuário dono da sessão |
| `token_hash` | `CHAR(64)` | Não | `UQ_RefreshTokens_hash` | Hash SHA-256 do refresh token |
| `familia` | `UNIQUEIDENTIFIER` | Não | | Identificador da cadeia de rotação de tokens |
| `expira_em` | `DATETIME2(0)` | Não | | Data limite de expiração (7 dias) |
| `revogado_em` | `DATETIME2(0)` | Sim | | Timestamp de revogação/logout |
| `criado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Data de emissão |
| `user_agent` | `NVARCHAR(200)` | Sim | | Informações de dispositivo/navegador |

### 2.5 `Disciplinas`
Disciplinas cursadas pelo aluno em um período letivo.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_disciplina` | `INT IDENTITY(1,1)` | Não | `PK_Disciplinas` | Identificador da matéria |
| `id_usuario` | `INT` | Não | `FK → Usuarios (CASCADE)` | Aluno proprietário |
| `nome` | `NVARCHAR(120)` | Não | `UQ: (id_usuario, nome)` | Nome da disciplina |
| `professor` | `NVARCHAR(120)` | Sim | | Professor responsável |
| `carga_horaria` | `INT` | Não | `CK: > 0` | Carga horária total (ex: 60h, 80h) |
| `descricao` | `NVARCHAR(1000)` | Sim | | Ementa ou anotações |
| `data_inicio` | `DATE` | Não | | Data de início das aulas |
| `data_fim` | `DATE` | Não | `CK: >= data_inicio` | Data de término das aulas/exames |
| `criado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Criação em UTC |
| `atualizado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Última alteração |

### 2.6 `Tarefas`
Atividades acadêmicas (trabalhos, listas, provas, projetos).

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_tarefa` | `INT IDENTITY(1,1)` | Não | `PK_Tarefas` | Identificador da atividade |
| `id_disciplina` | `INT` | Não | `FK → Disciplinas (CASCADE)` | Disciplina à qual pertence |
| `titulo` | `NVARCHAR(150)` | Não | | Título da tarefa |
| `descricao` | `NVARCHAR(2000)` | Sim | | Instruções e orientações |
| `data_prevista` | `DATE` | Sim | | Prazo limite de entrega (NULL = sem prazo) |
| `status` | `NVARCHAR(10)` | Não | `DF: 'Pendente'`, `CK: 'Pendente','Concluida'` | Situação da tarefa |
| `horas_estimadas` | `DECIMAL(6,2)` | Sim | `CK: > 0` | Estimativa inicial de tempo (horas) |
| `lembrete_nota` | `NVARCHAR(500)` | Sim | | Anotação breve do aluno |
| `concluida_em` | `DATETIME2(0)` | Sim | `CK_Tarefas_concluida_em` | Data/hora em que a tarefa foi concluída |
| `criado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Data de criação |
| `atualizado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Atualização |

### 2.7 `SessoesEstudo`
Intervalos de tempo efetivamente dedicados a uma tarefa específica.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_sessao` | `BIGINT IDENTITY(1,1)` | Não | `PK_SessoesEstudo` | Identificador da sessão |
| `id_tarefa` | `INT` | Não | `FK → Tarefas (CASCADE)` | Tarefa associada |
| `id_usuario` | `INT` | Não | `FK → Usuarios (NO ACTION)` | Dono da sessão (evita ciclos de cascata) |
| `inicio` | `DATETIME2(0)` | Não | | Início da sessão (UTC) |
| `fim` | `DATETIME2(0)` | Sim | `CK: fim > inicio` | Fim da sessão. Se NULL, cronômetro em execução |
| `duracao_seg` | `INT PERSISTED` | Sim | `DATEDIFF(SECOND, inicio, fim)` | Duração calculada automaticamente |
| `origem` | `NVARCHAR(12)` | Não | `CK: 'Cronometro','Manual'` | Modalidade de registro |
| `observacao` | `NVARCHAR(300)` | Sim | | Observação ou anotação livre |
| `criado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Data de registro |

### 2.8 `HistoricoAtividades`
Trilha de auditoria e linha do tempo de eventos do usuário (para relatórios e retrospectivas).

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_atividade` | `BIGINT IDENTITY(1,1)` | Não | `PK_HistoricoAtividades` | Identificador do evento |
| `id_usuario` | `INT` | Não | `FK → Usuarios (NO ACTION)` | Autor da atividade |
| `tipo` | `NVARCHAR(30)` | Não | `CK: 'TAREFA_CRIADA', ...` | Código de evento de negócio |
| `id_entidade` | `INT` | Sim | | ID de referência da tarefa ou disciplina |
| `nome_disciplina` | `NVARCHAR(120)` | Sim | | Snapshot do nome da matéria no momento |
| `descricao` | `NVARCHAR(300)` | Não | | Texto amigável explicativo da ação realizada |
| `criado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Timestamp do evento em UTC |

### 2.9 `InsightCache`
Cache do resultado das análises e enriquecimento com IA.

| Coluna | Tipo | Nulo | Chave / Restrição | Descrição |
|---|---|---|---|---|
| `id_cache` | `INT IDENTITY(1,1)` | Não | `PK_InsightCache` | Identificador do cache |
| `id_usuario` | `INT` | Não | `UQ`, `FK → Usuarios (CASCADE)` | Apenas 1 registro de cache por usuário |
| `hash_entrada` | `CHAR(64)` | Não | | Hash SHA-256 das métricas de entrada |
| `payload_json` | `NVARCHAR(MAX)` | Não | `CK: ISJSON(...) = 1` | Resposta completa estruturada dos insights |
| `gerado_em` | `DATETIME2(0)` | Não | `DF: SYSUTCDATETIME()` | Data de geração |
| `expira_em` | `DATETIME2(0)` | Não | | Expiração em 6 horas |
