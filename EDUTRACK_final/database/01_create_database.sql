-- ============================================================================
-- EduTrack AI v2 - 01_create_database.sql
-- Criação do banco de dados EduTrackAI com collation adequada
-- Idempotente (pode ser executado múltiplas vezes sem erro)
-- ============================================================================

USE [master];
GO

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE [name] = N'EduTrackAI')
BEGIN
    CREATE DATABASE [EduTrackAI]
    COLLATE Latin1_General_CI_AS;
    PRINT 'Banco de dados EduTrackAI criado com sucesso.';
END
ELSE
BEGIN
    PRINT 'Banco de dados EduTrackAI já existe. Nenhuma alteração estrutural necessária.';
END
GO
