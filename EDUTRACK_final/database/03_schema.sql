-- ============================================================================
-- EduTrack AI v2 - 03_schema.sql
-- DDL de criação das 9 tabelas estruturadas, constraints e relacionamentos
-- Idempotente (pode ser executado múltiplas vezes sem erro)
-- ============================================================================

USE [EduTrackAI];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Cursos
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'Cursos')
BEGIN
    CREATE TABLE [Cursos] (
        [id_curso] INT IDENTITY(1,1) NOT NULL,
        [nome] NVARCHAR(100) NOT NULL,
        CONSTRAINT [PK_Cursos] PRIMARY KEY CLUSTERED ([id_curso]),
        CONSTRAINT [UQ_Cursos_nome] UNIQUE NONCLUSTERED ([nome])
    );
    PRINT 'Tabela Cursos criada.';
END
GO

-- 2. Usuarios
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'Usuarios')
BEGIN
    CREATE TABLE [Usuarios] (
        [id_usuario] INT IDENTITY(1,1) NOT NULL,
        [nome] NVARCHAR(60) NOT NULL,
        [sobrenome] NVARCHAR(100) NOT NULL,
        [email] NVARCHAR(254) NOT NULL,
        [senha_hash] NVARCHAR(255) NOT NULL,
        [telefone] NVARCHAR(20) NULL,
        [id_curso] INT NOT NULL,
        [foto_perfil] NVARCHAR(500) NULL,
        [meta_semanal_horas] DECIMAL(5,2) NOT NULL CONSTRAINT [DF_Usuarios_meta] DEFAULT 10,
        [tema_preferido] NVARCHAR(10) NOT NULL CONSTRAINT [DF_Usuarios_tema] DEFAULT 'sistema',
        [tamanho_texto] NVARCHAR(12) NOT NULL CONSTRAINT [DF_Usuarios_texto] DEFAULT 'normal',
        [ia_habilitada] BIT NOT NULL CONSTRAINT [DF_Usuarios_ia] DEFAULT 1,
        [ativo] BIT NOT NULL CONSTRAINT [DF_Usuarios_ativo] DEFAULT 1,
        [criado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_Usuarios_criado] DEFAULT SYSUTCDATETIME(),
        [atualizado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_Usuarios_atualizado] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Usuarios] PRIMARY KEY CLUSTERED ([id_usuario]),
        CONSTRAINT [UQ_Usuarios_email] UNIQUE NONCLUSTERED ([email]),
        CONSTRAINT [FK_Usuarios_Cursos] FOREIGN KEY ([id_curso]) REFERENCES [Cursos]([id_curso]),
        CONSTRAINT [CK_Usuarios_meta_semanal] CHECK ([meta_semanal_horas] >= 0 AND [meta_semanal_horas] <= 168),
        CONSTRAINT [CK_Usuarios_tema] CHECK ([tema_preferido] IN ('claro','escuro','sistema')),
        CONSTRAINT [CK_Usuarios_texto] CHECK ([tamanho_texto] IN ('normal','grande','muito_grande'))
    );
    PRINT 'Tabela Usuarios criada.';
END
GO

-- 3. RecuperacaoSenha
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'RecuperacaoSenha')
BEGIN
    CREATE TABLE [RecuperacaoSenha] (
        [id_recuperacao] INT IDENTITY(1,1) NOT NULL,
        [id_usuario] INT NOT NULL,
        [codigo_hash] NVARCHAR(255) NOT NULL,
        [expira_em] DATETIME2(0) NOT NULL,
        [tentativas] TINYINT NOT NULL CONSTRAINT [DF_RecuperacaoSenha_tentativas] DEFAULT 0,
        [usado] BIT NOT NULL CONSTRAINT [DF_RecuperacaoSenha_usado] DEFAULT 0,
        [criado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_RecuperacaoSenha_criado] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_RecuperacaoSenha] PRIMARY KEY CLUSTERED ([id_recuperacao]),
        CONSTRAINT [FK_RecuperacaoSenha_Usuarios] FOREIGN KEY ([id_usuario]) REFERENCES [Usuarios]([id_usuario]) ON DELETE CASCADE,
        CONSTRAINT [CK_RecuperacaoSenha_tentativas] CHECK ([tentativas] <= 5)
    );
    PRINT 'Tabela RecuperacaoSenha criada.';
END
GO

-- 4. RefreshTokens
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'RefreshTokens')
BEGIN
    CREATE TABLE [RefreshTokens] (
        [id_refresh] BIGINT IDENTITY(1,1) NOT NULL,
        [id_usuario] INT NOT NULL,
        [token_hash] CHAR(64) NOT NULL,
        [familia] UNIQUEIDENTIFIER NOT NULL,
        [expira_em] DATETIME2(0) NOT NULL,
        [revogado_em] DATETIME2(0) NULL,
        [criado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_RefreshTokens_criado] DEFAULT SYSUTCDATETIME(),
        [user_agent] NVARCHAR(200) NULL,
        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY CLUSTERED ([id_refresh]),
        CONSTRAINT [UQ_RefreshTokens_hash] UNIQUE NONCLUSTERED ([token_hash]),
        CONSTRAINT [FK_RefreshTokens_Usuarios] FOREIGN KEY ([id_usuario]) REFERENCES [Usuarios]([id_usuario]) ON DELETE CASCADE
    );
    PRINT 'Tabela RefreshTokens criada.';
END
GO

-- 5. Disciplinas
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'Disciplinas')
BEGIN
    CREATE TABLE [Disciplinas] (
        [id_disciplina] INT IDENTITY(1,1) NOT NULL,
        [id_usuario] INT NOT NULL,
        [nome] NVARCHAR(120) NOT NULL,
        [professor] NVARCHAR(120) NULL,
        [carga_horaria] INT NOT NULL,
        [descricao] NVARCHAR(1000) NULL,
        [data_inicio] DATE NOT NULL,
        [data_fim] DATE NOT NULL,
        [criado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_Disciplinas_criado] DEFAULT SYSUTCDATETIME(),
        [atualizado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_Disciplinas_atualizado] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Disciplinas] PRIMARY KEY CLUSTERED ([id_disciplina]),
        CONSTRAINT [FK_Disciplinas_Usuarios] FOREIGN KEY ([id_usuario]) REFERENCES [Usuarios]([id_usuario]) ON DELETE CASCADE,
        CONSTRAINT [UQ_Disciplinas_usuario_nome] UNIQUE NONCLUSTERED ([id_usuario], [nome]),
        CONSTRAINT [CK_Disciplinas_carga_horaria] CHECK ([carga_horaria] > 0),
        CONSTRAINT [CK_Disciplinas_datas] CHECK ([data_fim] >= [data_inicio])
    );
    PRINT 'Tabela Disciplinas criada.';
END
GO

-- 6. Tarefas
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'Tarefas')
BEGIN
    CREATE TABLE [Tarefas] (
        [id_tarefa] INT IDENTITY(1,1) NOT NULL,
        [id_disciplina] INT NOT NULL,
        [titulo] NVARCHAR(150) NOT NULL,
        [descricao] NVARCHAR(2000) NULL,
        [data_prevista] DATE NULL,
        [status] NVARCHAR(10) NOT NULL CONSTRAINT [DF_Tarefas_status] DEFAULT 'Pendente',
        [horas_estimadas] DECIMAL(6,2) NULL,
        [lembrete_nota] NVARCHAR(500) NULL,
        [concluida_em] DATETIME2(0) NULL,
        [criado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_Tarefas_criado] DEFAULT SYSUTCDATETIME(),
        [atualizado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_Tarefas_atualizado] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_Tarefas] PRIMARY KEY CLUSTERED ([id_tarefa]),
        CONSTRAINT [FK_Tarefas_Disciplinas] FOREIGN KEY ([id_disciplina]) REFERENCES [Disciplinas]([id_disciplina]) ON DELETE CASCADE,
        CONSTRAINT [CK_Tarefas_status] CHECK ([status] IN ('Pendente','Concluida')),
        CONSTRAINT [CK_Tarefas_horas_estimadas] CHECK ([horas_estimadas] IS NULL OR [horas_estimadas] > 0),
        CONSTRAINT [CK_Tarefas_concluida_em] CHECK (
            ([status] = 'Concluida' AND [concluida_em] IS NOT NULL) OR 
            ([status] = 'Pendente' AND [concluida_em] IS NULL)
        )
    );
    PRINT 'Tabela Tarefas criada.';
END
GO

-- 7. SessoesEstudo
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'SessoesEstudo')
BEGIN
    CREATE TABLE [SessoesEstudo] (
        [id_sessao] BIGINT IDENTITY(1,1) NOT NULL,
        [id_tarefa] INT NOT NULL,
        [id_usuario] INT NOT NULL,
        [inicio] DATETIME2(0) NOT NULL,
        [fim] DATETIME2(0) NULL,
        [duracao_seg] AS DATEDIFF(SECOND, [inicio], [fim]) PERSISTED,
        [origem] NVARCHAR(12) NOT NULL,
        [observacao] NVARCHAR(300) NULL,
        [criado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_SessoesEstudo_criado] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_SessoesEstudo] PRIMARY KEY CLUSTERED ([id_sessao]),
        CONSTRAINT [FK_SessoesEstudo_Tarefas] FOREIGN KEY ([id_tarefa]) REFERENCES [Tarefas]([id_tarefa]) ON DELETE CASCADE,
        CONSTRAINT [FK_SessoesEstudo_Usuarios] FOREIGN KEY ([id_usuario]) REFERENCES [Usuarios]([id_usuario]) ON DELETE NO ACTION,
        CONSTRAINT [CK_SessoesEstudo_fim] CHECK ([fim] IS NULL OR [fim] >= [inicio]),
        CONSTRAINT [CK_SessoesEstudo_origem] CHECK ([origem] IN ('Cronometro','Manual'))
    );
    PRINT 'Tabela SessoesEstudo criada.';
END
GO

-- 8. HistoricoAtividades
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'HistoricoAtividades')
BEGIN
    CREATE TABLE [HistoricoAtividades] (
        [id_atividade] BIGINT IDENTITY(1,1) NOT NULL,
        [id_usuario] INT NOT NULL,
        [tipo] NVARCHAR(30) NOT NULL,
        [id_entidade] INT NULL,
        [nome_disciplina] NVARCHAR(120) NULL,
        [descricao] NVARCHAR(300) NOT NULL,
        [criado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_HistoricoAtividades_criado] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_HistoricoAtividades] PRIMARY KEY CLUSTERED ([id_atividade]),
        CONSTRAINT [FK_HistoricoAtividades_Usuarios] FOREIGN KEY ([id_usuario]) REFERENCES [Usuarios]([id_usuario]) ON DELETE NO ACTION,
        CONSTRAINT [CK_HistoricoAtividades_tipo] CHECK ([tipo] IN (
            'TAREFA_CRIADA',
            'TAREFA_CONCLUIDA',
            'TAREFA_REABERTA',
            'TAREFA_EDITADA',
            'TAREFA_EXCLUIDA',
            'DISCIPLINA_CRIADA',
            'DISCIPLINA_EDITADA',
            'DISCIPLINA_EXCLUIDA',
            'SESSAO_REGISTRADA'
        ))
    );
    PRINT 'Tabela HistoricoAtividades criada.';
END
GO

-- 9. InsightCache
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE [name] = N'InsightCache')
BEGIN
    CREATE TABLE [InsightCache] (
        [id_cache] INT IDENTITY(1,1) NOT NULL,
        [id_usuario] INT NOT NULL,
        [hash_entrada] CHAR(64) NOT NULL,
        [payload_json] NVARCHAR(MAX) NOT NULL,
        [gerado_em] DATETIME2(0) NOT NULL CONSTRAINT [DF_InsightCache_gerado] DEFAULT SYSUTCDATETIME(),
        [expira_em] DATETIME2(0) NOT NULL,
        CONSTRAINT [PK_InsightCache] PRIMARY KEY CLUSTERED ([id_cache]),
        CONSTRAINT [UQ_InsightCache_usuario] UNIQUE NONCLUSTERED ([id_usuario]),
        CONSTRAINT [FK_InsightCache_Usuarios] FOREIGN KEY ([id_usuario]) REFERENCES [Usuarios]([id_usuario]) ON DELETE CASCADE,
        CONSTRAINT [CK_InsightCache_json] CHECK (ISJSON([payload_json]) = 1)
    );
    PRINT 'Tabela InsightCache criada.';
END
GO
