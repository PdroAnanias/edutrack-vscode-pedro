-- ============================================================================
-- EduTrack AI v2 - 06_seed_cursos.sql
-- Seed de cursos padrão de graduação em Tecnologia
-- Idempotente (não duplica cursos)
-- ============================================================================

USE [EduTrackAI];
GO

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM [Cursos] WHERE [nome] = N'Ciência da Computação')
    INSERT INTO [Cursos] ([nome]) VALUES (N'Ciência da Computação');

IF NOT EXISTS (SELECT 1 FROM [Cursos] WHERE [nome] = N'Sistemas de Informação')
    INSERT INTO [Cursos] ([nome]) VALUES (N'Sistemas de Informação');

IF NOT EXISTS (SELECT 1 FROM [Cursos] WHERE [nome] = N'Análise e Desenvolvimento de Sistemas')
    INSERT INTO [Cursos] ([nome]) VALUES (N'Análise e Desenvolvimento de Sistemas');

IF NOT EXISTS (SELECT 1 FROM [Cursos] WHERE [nome] = N'Engenharia de Software')
    INSERT INTO [Cursos] ([nome]) VALUES (N'Engenharia de Software');

PRINT 'Cursos de graduação semeados com sucesso.';
GO
