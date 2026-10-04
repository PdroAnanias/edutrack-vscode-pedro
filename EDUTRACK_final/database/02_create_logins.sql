-- ============================================================================
-- EduTrack AI v2 - 02_create_logins.sql
-- Criação de Logins no Servidor e Usuários no Banco EduTrackAI
-- As senhas e nomes de logins são injetados via variáveis do SQLCMD:
--   $(DB_APP_USER), $(DB_APP_PASSWORD), $(DB_PY_USER), $(DB_PY_PASSWORD)
-- Nenhuma senha fica hardcoded neste arquivo. Idempotente.
-- ============================================================================

USE [master];
GO

-- 1. Login e Usuário para a Aplicação Node.js (edutrack_app)
DECLARE @AppUser sysname = N'$(DB_APP_USER)';
DECLARE @AppPass NVARCHAR(128) = N'$(DB_APP_PASSWORD)';

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE [name] = @AppUser)
BEGIN
    DECLARE @sqlCreateApp NVARCHAR(MAX) = N'CREATE LOGIN ' + QUOTENAME(@AppUser) + N' WITH PASSWORD = ' + QUOTENAME(@AppPass, '''') + N', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;';
    EXEC (@sqlCreateApp);
    PRINT 'Login [' + @AppUser + '] criado no SQL Server.';
END
ELSE
BEGIN
    DECLARE @sqlAlterApp NVARCHAR(MAX) = N'ALTER LOGIN ' + QUOTENAME(@AppUser) + N' WITH PASSWORD = ' + QUOTENAME(@AppPass, '''') + N', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;';
    EXEC (@sqlAlterApp);
    PRINT 'Login [' + @AppUser + '] atualizado com sucesso.';
END
GO

USE [EduTrackAI];
GO

DECLARE @AppUser sysname = N'$(DB_APP_USER)';
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE [name] = @AppUser)
BEGIN
    DECLARE @sqlUserApp NVARCHAR(MAX) = N'CREATE USER ' + QUOTENAME(@AppUser) + N' FOR LOGIN ' + QUOTENAME(@AppUser) + N';';
    EXEC (@sqlUserApp);
    PRINT 'Usuário [' + @AppUser + '] associado ao banco EduTrackAI.';
END

EXEC sp_addrolemember 'db_datareader', @AppUser;
EXEC sp_addrolemember 'db_datawriter', @AppUser;
DECLARE @sqlGrant NVARCHAR(MAX) = N'GRANT EXECUTE TO ' + QUOTENAME(@AppUser) + N';';
EXEC (@sqlGrant);
PRINT 'Permissões atribuídas a [' + @AppUser + ']: db_datareader, db_datawriter, EXECUTE.';
GO

USE [master];
GO

-- 2. Login e Usuário Somente Leitura para o Microsserviço Python (edutrack_py_ro)
DECLARE @PyUser sysname = N'$(DB_PY_USER)';
DECLARE @PyPass NVARCHAR(128) = N'$(DB_PY_PASSWORD)';

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE [name] = @PyUser)
BEGIN
    DECLARE @sqlCreatePy NVARCHAR(MAX) = N'CREATE LOGIN ' + QUOTENAME(@PyUser) + N' WITH PASSWORD = ' + QUOTENAME(@PyPass, '''') + N', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;';
    EXEC (@sqlCreatePy);
    PRINT 'Login [' + @PyUser + '] criado no SQL Server.';
END
ELSE
BEGIN
    DECLARE @sqlAlterPy NVARCHAR(MAX) = N'ALTER LOGIN ' + QUOTENAME(@PyUser) + N' WITH PASSWORD = ' + QUOTENAME(@PyPass, '''') + N', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;';
    EXEC (@sqlAlterPy);
    PRINT 'Login [' + @PyUser + '] atualizado com sucesso.';
END
GO

USE [EduTrackAI];
GO

DECLARE @PyUser sysname = N'$(DB_PY_USER)';
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE [name] = @PyUser)
BEGIN
    DECLARE @sqlUserPy NVARCHAR(MAX) = N'CREATE USER ' + QUOTENAME(@PyUser) + N' FOR LOGIN ' + QUOTENAME(@PyUser) + N';';
    EXEC (@sqlUserPy);
    PRINT 'Usuário [' + @PyUser + '] associado ao banco EduTrackAI.';
END

EXEC sp_addrolemember 'db_datareader', @PyUser;
PRINT 'Permissões atribuídas a [' + @PyUser + ']: db_datareader (somente leitura).';
GO
