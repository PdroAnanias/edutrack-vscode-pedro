-- ============================================================================
-- EduTrack AI v2 - 04_indexes.sql
-- Índices para performance e restrições filtradas
-- Inclui UX_Sessoes_ativa_por_usuario para garantir 1 cronômetro ativo por aluno
-- Idempotente (pode ser executado múltiplas vezes)
-- ============================================================================

USE [EduTrackAI];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Disciplinas por usuário
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_Disciplinas_usuario' AND [object_id] = OBJECT_ID(N'Disciplinas'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Disciplinas_usuario]
    ON [Disciplinas] ([id_usuario]);
    PRINT 'Índice IX_Disciplinas_usuario criado.';
END
GO

-- 2. Tarefas por disciplina e status com colunas de cobertura
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_Tarefas_disciplina_status' AND [object_id] = OBJECT_ID(N'Tarefas'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Tarefas_disciplina_status]
    ON [Tarefas] ([id_disciplina], [status])
    INCLUDE ([data_prevista], [horas_estimadas], [concluida_em]);
    PRINT 'Índice IX_Tarefas_disciplina_status criado.';
END
GO

-- 3. Tarefas por data prevista (filtros e ordenações)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_Tarefas_data_prevista' AND [object_id] = OBJECT_ID(N'Tarefas'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Tarefas_data_prevista]
    ON [Tarefas] ([data_prevista]);
    PRINT 'Índice IX_Tarefas_data_prevista criado.';
END
GO

-- 4. Tarefas por criado_em (relatório semanal)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_Tarefas_criado_em' AND [object_id] = OBJECT_ID(N'Tarefas'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Tarefas_criado_em]
    ON [Tarefas] ([criado_em]);
    PRINT 'Índice IX_Tarefas_criado_em criado.';
END
GO

-- 5. Sessões por tarefa com cobertura de tempo
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_Sessoes_tarefa' AND [object_id] = OBJECT_ID(N'SessoesEstudo'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Sessoes_tarefa]
    ON [SessoesEstudo] ([id_tarefa])
    INCLUDE ([inicio], [fim], [duracao_seg]);
    PRINT 'Índice IX_Sessoes_tarefa criado.';
END
GO

-- 6. Sessões por usuário e início (métricas por semana)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_Sessoes_usuario_inicio' AND [object_id] = OBJECT_ID(N'SessoesEstudo'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Sessoes_usuario_inicio]
    ON [SessoesEstudo] ([id_usuario], [inicio]);
    PRINT 'Índice IX_Sessoes_usuario_inicio criado.';
END
GO

-- 7. Índice único filtrado: Apenas um cronômetro ativo por usuário
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_Sessoes_ativa_por_usuario' AND [object_id] = OBJECT_ID(N'SessoesEstudo'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_Sessoes_ativa_por_usuario]
    ON [SessoesEstudo] ([id_usuario])
    WHERE [fim] IS NULL;
    PRINT 'Índice único UX_Sessoes_ativa_por_usuario criado.';
END
GO

-- 8. Histórico por usuário e data decrescente
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_Historico_usuario_data' AND [object_id] = OBJECT_ID(N'HistoricoAtividades'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Historico_usuario_data]
    ON [HistoricoAtividades] ([id_usuario], [criado_em] DESC);
    PRINT 'Índice IX_Historico_usuario_data criado.';
END
GO

-- 9. RefreshTokens por usuário e expiração
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_RefreshTokens_usuario' AND [object_id] = OBJECT_ID(N'RefreshTokens'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_RefreshTokens_usuario]
    ON [RefreshTokens] ([id_usuario], [expira_em]);
    PRINT 'Índice IX_RefreshTokens_usuario criado.';
END
GO
