-- ============================================================================
-- EduTrack AI v2 - 07_seed_demo.sql
-- Dados de demonstração realistas para aluno@edutrack.ai (6 semanas de histórico)
-- Totalmente anonimizado e fictício (sem dados pessoais)
-- Idempotente (limpa dados de demo anteriores antes de reinserir)
-- ============================================================================

USE [EduTrackAI];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

-- 1. Obter Curso Padrão
DECLARE @IdCurso INT;
SELECT TOP 1 @IdCurso = [id_curso] FROM [Cursos] WHERE [nome] = N'Ciência da Computação';
IF @IdCurso IS NULL
BEGIN
    INSERT INTO [Cursos] ([nome]) VALUES (N'Ciência da Computação');
    SET @IdCurso = SCOPE_IDENTITY();
END

-- 2. Limpar dados anteriores do usuário demo se existirem (Garante idempotência)
DECLARE @IdUsuario INT;
SELECT @IdUsuario = [id_usuario] FROM [Usuarios] WHERE [email] = N'aluno@edutrack.ai';

IF @IdUsuario IS NOT NULL
BEGIN
    DELETE FROM [SessoesEstudo] WHERE [id_usuario] = @IdUsuario;
    DELETE FROM [HistoricoAtividades] WHERE [id_usuario] = @IdUsuario;
    DELETE FROM [InsightCache] WHERE [id_usuario] = @IdUsuario;
    DELETE FROM [RefreshTokens] WHERE [id_usuario] = @IdUsuario;
    DELETE FROM [RecuperacaoSenha] WHERE [id_usuario] = @IdUsuario;
    DELETE FROM [Disciplinas] WHERE [id_usuario] = @IdUsuario;
    DELETE FROM [Usuarios] WHERE [id_usuario] = @IdUsuario;
    PRINT 'Dados anteriores do usuário demo (aluno@edutrack.ai) limpos.';
END

-- 3. Inserir Usuário de Demonstração (Senha padrão: 123456)
INSERT INTO [Usuarios] (
    [nome], [sobrenome], [email], [senha_hash], [telefone], 
    [id_curso], [foto_perfil], [meta_semanal_horas], [tema_preferido], 
    [tamanho_texto], [ia_habilitada], [ativo], [criado_em]
)
VALUES (
    N'Aluno', N'Demonstração', N'aluno@edutrack.ai',
    N'$2b$10$RL7KNsu7FDSxxucakP/INeIzXUmg73bCsx52LcVqHp/EOWdivdkuW',
    N'(11) 99999-0000', @IdCurso, NULL, 12.0, N'sistema', N'normal', 1, 1,
    DATEADD(WEEK, -8, SYSUTCDATETIME())
);

SET @IdUsuario = SCOPE_IDENTITY();
PRINT 'Usuário demo criado com ID: ' + CAST(@IdUsuario AS NVARCHAR(10));

-- 4. Inserir 5 Disciplinas
DECLARE @D1 INT, @D2 INT, @D3 INT, @D4 INT, @D5 INT;
DECLARE @Hoje DATE = CAST(GETDATE() AS DATE);

-- D1: Programação em Python (80h) - Desvio alto (> 30%)
INSERT INTO [Disciplinas] ([id_usuario], [nome], [professor], [carga_horaria], [descricao], [data_inicio], [data_fim], [criado_em])
VALUES (@IdUsuario, N'Programação em Python', N'Prof. Dr. Ricardo Santos', 80, N'Algoritmos, estruturas de dados, POO e bibliotecas científicas.', DATEADD(WEEK, -6, @Hoje), DATEADD(WEEK, 8, @Hoje), DATEADD(WEEK, -6, SYSUTCDATETIME()));
SET @D1 = SCOPE_IDENTITY();

-- D2: Banco de Dados Relacional (60h) - Eficiência alta (< -20%)
INSERT INTO [Disciplinas] ([id_usuario], [nome], [professor], [carga_horaria], [descricao], [data_inicio], [data_fim], [criado_em])
VALUES (@IdUsuario, N'Banco de Dados Relacional', N'Prof. Carlos Eduardo', 60, N'Modelagem relacional, SQL avançado, transações e índices.', DATEADD(WEEK, -6, @Hoje), DATEADD(WEEK, 7, @Hoje), DATEADD(WEEK, -6, SYSUTCDATETIME()));
SET @D2 = SCOPE_IDENTITY();

-- D3: Engenharia de Software (60h) - No prazo
INSERT INTO [Disciplinas] ([id_usuario], [nome], [professor], [carga_horaria], [descricao], [data_inicio], [data_fim], [criado_em])
VALUES (@IdUsuario, N'Engenharia de Software', N'Profª. Dra. Mariana Costa', 60, N'Arquitetura, design patterns GoF, Scrum e testes.', DATEADD(WEEK, -6, @Hoje), DATEADD(WEEK, 6, @Hoje), DATEADD(WEEK, -6, SYSUTCDATETIME()));
SET @D3 = SCOPE_IDENTITY();

-- D4: Redes e Segurança da Informação (60h) - Em risco / atrasada
INSERT INTO [Disciplinas] ([id_usuario], [nome], [professor], [carga_horaria], [descricao], [data_inicio], [data_fim], [criado_em])
VALUES (@IdUsuario, N'Redes e Segurança', N'Prof. Fernando Moura', 60, N'Protocolos TCP/IP, segurança de redes, firewalls e criptografia.', DATEADD(WEEK, -6, @Hoje), DATEADD(DAY, 4, @Hoje), DATEADD(WEEK, -6, SYSUTCDATETIME()));
SET @D4 = SCOPE_IDENTITY();

-- D5: Algoritmos e Complexidade (80h) - No ritmo
INSERT INTO [Disciplinas] ([id_usuario], [nome], [professor], [carga_horaria], [descricao], [data_inicio], [data_fim], [criado_em])
VALUES (@IdUsuario, N'Algoritmos e Complexidade', N'Profª. Beatriz Lima', 80, N'Árvores balanceadas, grafos e notação assintótica Big-O.', DATEADD(WEEK, -6, @Hoje), DATEADD(WEEK, 9, @Hoje), DATEADD(WEEK, -6, SYSUTCDATETIME()));
SET @D5 = SCOPE_IDENTITY();

-- 5. Inserir Tarefas e Sessões de Estudo
DECLARE @T_ID INT;

-- ==================== D1: Programação em Python (Desvio Alto) ====================
-- Tarefa 1 (Concluída - Estimada 4h, Real 6.5h -> +62% desvio)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D1, N'Estruturas de Dados Básicas em Python', N'Exercícios práticos de listas, tuplas, dicts e sets.', DATEADD(DAY, -30, @Hoje), 'Concluida', 4.0, N'Capítulo 3', DATEADD(DAY, -29, SYSUTCDATETIME()), DATEADD(DAY, -35, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -680, SYSUTCDATETIME()), DATEADD(HOUR, -676, SYSUTCDATETIME()), 'Manual', N'Estudo de dicionários e list comprehensions'),
       (@T_ID, @IdUsuario, DATEADD(HOUR, -660, SYSUTCDATETIME()), DATEADD(HOUR, -657, DATEADD(MINUTE, -30, SYSUTCDATETIME())), 'Manual', N'Resolução de bugs nos exercícios');

-- Tarefa 2 (Concluída - Estimada 5h, Real 7.5h)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D1, N'Programação Orientada a Objetos com Dataclasses', N'Modelagem de classes de domínio e herança.', DATEADD(DAY, -20, @Hoje), 'Concluida', 5.0, N'Revisar @property', DATEADD(DAY, -19, SYSUTCDATETIME()), DATEADD(DAY, -28, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -460, SYSUTCDATETIME()), DATEADD(HOUR, -455, SYSUTCDATETIME()), 'Manual', N'Implementação das classes'),
       (@T_ID, @IdUsuario, DATEADD(HOUR, -440, SYSUTCDATETIME()), DATEADD(HOUR, -437, DATEADD(MINUTE, -30, SYSUTCDATETIME())), 'Cronometro', N'Refatoração com Dataclasses');

-- Tarefa 3 (Concluída - Estimada 6h, Real 9.0h)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D1, N'Processamento Concorrente com Asyncio', N'Pipeline assíncrono para download e parsing de dados.', DATEADD(DAY, -10, @Hoje), 'Concluida', 6.0, N'Atenção ao Event Loop', DATEADD(DAY, -8, SYSUTCDATETIME()), DATEADD(DAY, -18, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -200, SYSUTCDATETIME()), DATEADD(HOUR, -195, SYSUTCDATETIME()), 'Manual', N'Estudo da documentação do asyncio'),
       (@T_ID, @IdUsuario, DATEADD(HOUR, -180, SYSUTCDATETIME()), DATEADD(HOUR, -176, SYSUTCDATETIME()), 'Cronometro', N'Tratamento de exceções concorrentes');

-- Tarefa 4 (Pendente - Vencendo em 3 dias)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D1, N'Desenvolvimento de API REST com FastAPI', N'Endpoints CRUD autenticados e documentação OpenAPI.', DATEADD(DAY, 3, @Hoje), 'Pendente', 8.0, N'Utilizar Pydantic v2', NULL, DATEADD(DAY, -7, SYSUTCDATETIME()));

-- Tarefa 5 (Pendente)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D1, N'Testes Automatizados com Pytest e Fixtures', N'Cobertura de testes unitários superior a 80%.', DATEADD(DAY, 14, @Hoje), 'Pendente', 5.0, NULL, NULL, DATEADD(DAY, -5, SYSUTCDATETIME()));

-- ==================== D2: Banco de Dados Relacional (Desvio Baixo / Rápido) ====================
-- Tarefa 1 (Concluída - Estimada 6h, Real 4h -> -33%)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D2, N'Normalização até a 3ª Forma Normal', N'Mapeamento conceitual, lógico e normalização relacional.', DATEADD(DAY, -28, @Hoje), 'Concluida', 6.0, N'Verificar dependências transitivas', DATEADD(DAY, -27, SYSUTCDATETIME()), DATEADD(DAY, -35, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -650, SYSUTCDATETIME()), DATEADD(HOUR, -646, SYSUTCDATETIME()), 'Manual', N'Normalização do modelo hospitalar');

-- Tarefa 2 (Concluída - Estimada 5h, Real 3.5h -> -30%)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D2, N'Procedures e Triggers no SQL Server', N'Desenvolvimento de rotinas transacionais e logs de auditoria.', DATEADD(DAY, -18, @Hoje), 'Concluida', 5.0, N'Usar TRY...CATCH', DATEADD(DAY, -17, SYSUTCDATETIME()), DATEADD(DAY, -25, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -410, SYSUTCDATETIME()), DATEADD(HOUR, -406, DATEADD(MINUTE, -30, SYSUTCDATETIME())), 'Cronometro', N'Criação de triggers e stored procedures');

-- Tarefa 3 (Concluída - Estimada 4h, Real 3h)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D2, N'Otimização com Índices Clustered e Nonclustered', N'Análise de planos de execução e otimização de I/O.', DATEADD(DAY, -7, @Hoje), 'Concluida', 4.0, N'Evitar scans desnecessários', DATEADD(DAY, -6, SYSUTCDATETIME()), DATEADD(DAY, -15, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -150, SYSUTCDATETIME()), DATEADD(HOUR, -147, SYSUTCDATETIME()), 'Manual', N'Execução de scripts com estatísticas ativas');

-- Tarefa 4 (Pendente)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D2, N'Consultas Analíticas com Window Functions', N'Uso prático de ROW_NUMBER, RANK, DENSE_RANK e NTILE.', DATEADD(DAY, 6, @Hoje), 'Pendente', 4.0, NULL, NULL, DATEADD(DAY, -3, SYSUTCDATETIME()));

-- ==================== D3: Engenharia de Software ====================
-- Tarefa 1 (Concluída)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D3, N'Diagrama de Classes UML e Casos de Uso', N'Modelagem do sistema de gestão acadêmica no PlantUML.', DATEADD(DAY, -22, @Hoje), 'Concluida', 5.0, N'Validado com PO', DATEADD(DAY, -21, SYSUTCDATETIME()), DATEADD(DAY, -30, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -500, SYSUTCDATETIME()), DATEADD(HOUR, -495, SYSUTCDATETIME()), 'Manual', N'Diagramas de classes e pacotes');

-- Tarefa 2 (Concluída)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D3, N'Aplicação de Padrões GoF (Factory e Strategy)', N'Refatoração do módulo de pagamento usando Design Patterns.', DATEADD(DAY, -12, @Hoje), 'Concluida', 4.0, NULL, DATEADD(DAY, -11, SYSUTCDATETIME()), DATEADD(DAY, -20, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -260, SYSUTCDATETIME()), DATEADD(HOUR, -256, SYSUTCDATETIME()), 'Cronometro', N'Design patterns em C#');

-- Tarefa 3 (Pendente)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D3, N'Planejamento de Sprint e Estimativa Planning Poker', N'Backlog refinement e quebra de estórias de usuário.', DATEADD(DAY, 5, @Hoje), 'Pendente', 3.0, N'Alinhar com time', NULL, DATEADD(DAY, -4, SYSUTCDATETIME()));

-- ==================== D4: Redes e Segurança (Em Risco e Atrasadas) ====================
-- Tarefa 1 (Atrasada! Vencida há 3 dias)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D4, N'Configuração de Sub-redes e Roteamento OSPF', N'Cálculo de máscaras VLSM e configuração no Packet Tracer.', DATEADD(DAY, -3, @Hoje), 'Pendente', 6.0, N'URGENTE: Entrega atrasada!', NULL, DATEADD(DAY, -15, SYSUTCDATETIME()));

-- Tarefa 2 (Atrasada! Vencida há 1 dia)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D4, N'Implementação de Regras de Firewall iptables', N'Políticas de DROP/ACCEPT e proteção contra scan de portas.', DATEADD(DAY, -1, @Hoje), 'Pendente', 4.0, N'Rever regras de NAT', NULL, DATEADD(DAY, -10, SYSUTCDATETIME()));

-- Tarefa 3 (Pendente - Vencendo amanhã)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D4, N'Criptografia Assimétrica e Certificados X.509', N'Geração de chaves RSA e configuração de HTTPS com OpenSSL.', DATEADD(DAY, 1, @Hoje), 'Pendente', 5.0, N'Prova prática de laboratório', NULL, DATEADD(DAY, -6, SYSUTCDATETIME()));

-- ==================== D5: Algoritmos e Complexidade ====================
-- Tarefa 1 (Concluída)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D5, N'Árvores AVL e Balanceamento de Rotações', N'Implementação de rotações simples e duplas em C++.', DATEADD(DAY, -25, @Hoje), 'Concluida', 6.0, NULL, DATEADD(DAY, -24, SYSUTCDATETIME()), DATEADD(DAY, -35, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -580, SYSUTCDATETIME()), DATEADD(HOUR, -574, SYSUTCDATETIME()), 'Manual', N'Balanceamento de árvores binárias');

-- Tarefa 2 (Concluída)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D5, N'Algoritmo de Dijkstra e Caminho Mínimo em Grafos', N'Implementação de fila de prioridade com Heap binário.', DATEADD(DAY, -14, @Hoje), 'Concluida', 5.0, NULL, DATEADD(DAY, -13, SYSUTCDATETIME()), DATEADD(DAY, -25, SYSUTCDATETIME()));
SET @T_ID = SCOPE_IDENTITY();
INSERT INTO [SessoesEstudo] ([id_tarefa], [id_usuario], [inicio], [fim], [origem], [observacao])
VALUES (@T_ID, @IdUsuario, DATEADD(HOUR, -310, SYSUTCDATETIME()), DATEADD(HOUR, -305, SYSUTCDATETIME()), 'Cronometro', N'Dijkstra com min-heap');

-- Tarefa 3 (Pendente)
INSERT INTO [Tarefas] ([id_disciplina], [titulo], [descricao], [data_prevista], [status], [horas_estimadas], [lembrete_nota], [concluida_em], [criado_em])
VALUES (@D5, N'Programação Dinâmica: Problema da Mochila', N'Abordagem top-down com memoization e bottom-up tabular.', DATEADD(DAY, 10, @Hoje), 'Pendente', 6.0, NULL, NULL, DATEADD(DAY, -5, SYSUTCDATETIME()));

-- 6. Inserir Histórico de Atividades Recentes
INSERT INTO [HistoricoAtividades] ([id_usuario], [tipo], [id_entidade], [nome_disciplina], [descricao], [criado_em])
VALUES 
    (@IdUsuario, 'TAREFA_CONCLUIDA', NULL, N'Programação em Python', N'Tarefa "Processamento Concorrente com Asyncio" concluída', DATEADD(DAY, -8, SYSUTCDATETIME())),
    (@IdUsuario, 'SESSAO_REGISTRADA', NULL, N'Programação em Python', N'Sessão de estudo de 4.0h registrada via Cronômetro', DATEADD(DAY, -8, SYSUTCDATETIME())),
    (@IdUsuario, 'TAREFA_CONCLUIDA', NULL, N'Banco de Dados Relacional', N'Tarefa "Otimização com Índices" concluída', DATEADD(DAY, -6, SYSUTCDATETIME())),
    (@IdUsuario, 'SESSAO_REGISTRADA', NULL, N'Banco de Dados Relacional', N'Sessão de estudo de 3.0h registrada manualmente', DATEADD(DAY, -6, SYSUTCDATETIME())),
    (@IdUsuario, 'TAREFA_CRIADA', NULL, N'Redes e Segurança', N'Tarefa "Criptografia Assimétrica e Certificados X.509" criada', DATEADD(DAY, -6, SYSUTCDATETIME())),
    (@IdUsuario, 'TAREFA_CRIADA', NULL, N'Programação em Python', N'Tarefa "Desenvolvimento de API REST com FastAPI" criada', DATEADD(DAY, -7, SYSUTCDATETIME()));

PRINT 'Seed de demonstração populado com sucesso para aluno@edutrack.ai (senha: 123456)!';
GO
