-- ============================================================================
-- EduTrack AI v2 - 05_views.sql
-- Views analíticas: vw_TarefaTempo, vw_ProgressoDisciplina, vw_HorasPorSemana
-- Idempotente (CREATE OR ALTER)
-- ============================================================================

USE [EduTrackAI];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. View: vw_TarefaTempo
CREATE OR ALTER VIEW [dbo].[vw_TarefaTempo]
AS
SELECT 
    t.[id_tarefa],
    t.[id_disciplina],
    t.[titulo],
    t.[status],
    t.[data_prevista],
    t.[horas_estimadas],
    ISNULL(CAST(ROUND(SUM(s.[duracao_seg]) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) AS [horas_reais],
    CASE 
        WHEN t.[horas_estimadas] IS NOT NULL AND t.[horas_estimadas] > 0 AND SUM(s.[duracao_seg]) > 0
        THEN CAST(ROUND(((SUM(s.[duracao_seg]) / 3600.0 - t.[horas_estimadas]) / t.[horas_estimadas]) * 100.0, 2) AS DECIMAL(6,2))
        ELSE NULL 
    END AS [desvio_pct],
    CASE 
        WHEN t.[status] = 'Pendente' AND t.[data_prevista] IS NOT NULL AND t.[data_prevista] < CAST(GETDATE() AS DATE) 
        THEN 1 
        ELSE 0 
    END AS [atrasada]
FROM [dbo].[Tarefas] t
LEFT JOIN [dbo].[SessoesEstudo] s ON s.[id_tarefa] = t.[id_tarefa] AND s.[fim] IS NOT NULL
GROUP BY 
    t.[id_tarefa],
    t.[id_disciplina],
    t.[titulo],
    t.[status],
    t.[data_prevista],
    t.[horas_estimadas];
GO

-- 2. View: vw_ProgressoDisciplina
CREATE OR ALTER VIEW [dbo].[vw_ProgressoDisciplina]
AS
WITH TarefasComPeso AS (
    SELECT 
        t.[id_tarefa],
        t.[id_disciplina],
        t.[status],
        t.[horas_estimadas],
        ISNULL(
            t.[horas_estimadas],
            ISNULL(AVG(t.[horas_estimadas]) OVER (PARTITION BY t.[id_disciplina]), 1.0)
        ) AS [peso_tarefa],
        CASE 
            WHEN t.[status] = 'Pendente' AND t.[data_prevista] IS NOT NULL AND t.[data_prevista] < CAST(GETDATE() AS DATE) 
            THEN 1 
            ELSE 0 
        END AS [atrasada],
        ISNULL((
            SELECT CAST(ROUND(SUM(s.[duracao_seg]) / 3600.0, 2) AS DECIMAL(8,2))
            FROM [dbo].[SessoesEstudo] s
            WHERE s.[id_tarefa] = t.[id_tarefa] AND s.[fim] IS NOT NULL
        ), 0.00) AS [horas_reais_tarefa]
    FROM [dbo].[Tarefas] t
)
SELECT 
    d.[id_disciplina],
    d.[id_usuario],
    d.[nome] AS [nome_disciplina],
    d.[carga_horaria],
    d.[data_inicio],
    d.[data_fim],
    COUNT(tcp.[id_tarefa]) AS [total_tarefas],
    SUM(CASE WHEN tcp.[status] = 'Concluida' THEN 1 ELSE 0 END) AS [concluidas],
    SUM(CASE WHEN tcp.[status] = 'Pendente' THEN 1 ELSE 0 END) AS [pendentes],
    SUM(tcp.[atrasada]) AS [atrasadas],
    ISNULL(SUM(tcp.[horas_estimadas]), 0.00) AS [horas_estimadas_total],
    ISNULL(SUM(CASE WHEN tcp.[status] = 'Concluida' THEN tcp.[horas_estimadas] ELSE 0.00 END), 0.00) AS [horas_estimadas_concluidas],
    ISNULL(SUM(tcp.[horas_reais_tarefa]), 0.00) AS [horas_reais_total],
    CASE 
        WHEN COUNT(tcp.[id_tarefa]) > 0 
        THEN CAST(ROUND((CAST(SUM(CASE WHEN tcp.[status] = 'Concluida' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(tcp.[id_tarefa])) * 100.0, 1) AS DECIMAL(5,1))
        ELSE 0.0 
    END AS [progresso_simples_pct],
    CASE 
        WHEN SUM(tcp.[peso_tarefa]) > 0 
        THEN CAST(ROUND((CAST(SUM(CASE WHEN tcp.[status] = 'Concluida' THEN tcp.[peso_tarefa] ELSE 0 END) AS FLOAT) / SUM(tcp.[peso_tarefa])) * 100.0, 1) AS DECIMAL(5,1))
        ELSE 0.0 
    END AS [progresso_ponderado_pct]
FROM [dbo].[Disciplinas] d
LEFT JOIN TarefasComPeso tcp ON tcp.[id_disciplina] = d.[id_disciplina]
GROUP BY 
    d.[id_disciplina],
    d.[id_usuario],
    d.[nome],
    d.[carga_horaria],
    d.[data_inicio],
    d.[data_fim];
GO

-- 3. View: vw_HorasPorSemana
CREATE OR ALTER VIEW [dbo].[vw_HorasPorSemana]
AS
WITH SessoesSemana AS (
    SELECT 
        s.[id_usuario],
        DATEPART(YEAR, s.[inicio]) AS [ano],
        DATEPART(ISO_WEEK, s.[inicio]) AS [semana_iso],
        CAST(DATEADD(DAY, 1 - DATEPART(WEEKDAY, DATEADD(DAY, @@DATEFIRST - 1, s.[inicio])), CAST(s.[inicio] AS DATE)) AS DATE) AS [semana_inicio],
        CAST(ROUND(SUM(s.[duracao_seg]) / 3600.0, 2) AS DECIMAL(8,2)) AS [horas_estudadas]
    FROM [dbo].[SessoesEstudo] s
    WHERE s.[fim] IS NOT NULL
    GROUP BY 
        s.[id_usuario],
        DATEPART(YEAR, s.[inicio]),
        DATEPART(ISO_WEEK, s.[inicio]),
        CAST(DATEADD(DAY, 1 - DATEPART(WEEKDAY, DATEADD(DAY, @@DATEFIRST - 1, s.[inicio])), CAST(s.[inicio] AS DATE)) AS DATE)
),
TarefasConcluidasSemana AS (
    SELECT 
        d.[id_usuario],
        DATEPART(YEAR, t.[concluida_em]) AS [ano],
        DATEPART(ISO_WEEK, t.[concluida_em]) AS [semana_iso],
        COUNT(*) AS [tarefas_concluidas]
    FROM [dbo].[Tarefas] t
    JOIN [dbo].[Disciplinas] d ON d.[id_disciplina] = t.[id_disciplina]
    WHERE t.[status] = 'Concluida' AND t.[concluida_em] IS NOT NULL
    GROUP BY 
        d.[id_usuario],
        DATEPART(YEAR, t.[concluida_em]),
        DATEPART(ISO_WEEK, t.[concluida_em])
)
SELECT 
    ISNULL(ss.[id_usuario], tc.[id_usuario]) AS [id_usuario],
    ISNULL(ss.[ano], tc.[ano]) AS [ano],
    ISNULL(ss.[semana_iso], tc.[semana_iso]) AS [semana_iso],
    ss.[semana_inicio],
    ISNULL(ss.[horas_estudadas], 0.00) AS [horas_estudadas],
    ISNULL(tc.[tarefas_concluidas], 0) AS [tarefas_concluidas]
FROM SessoesSemana ss
FULL OUTER JOIN TarefasConcluidasSemana tc 
    ON tc.[id_usuario] = ss.[id_usuario] 
   AND tc.[ano] = ss.[ano] 
   AND tc.[semana_iso] = ss.[semana_iso];
GO
PRINT 'Views analíticas criadas com sucesso (vw_TarefaTempo, vw_ProgressoDisciplina, vw_HorasPorSemana).';
GO
