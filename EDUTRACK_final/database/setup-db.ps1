# ============================================================================
# EduTrack AI v2 - database/setup-db.ps1
# Script de automacao e setup completo do banco Microsoft SQL Server
# Idempotente: pode ser executado multiplas vezes sem erro ou perda de dados
# ============================================================================

[CmdletBinding()]
param(
    [string]$Server,
    [string]$Database,
    [string]$AppUser,
    [string]$AppPassword,
    [string]$PyUser,
    [string]$PyPassword
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "         EduTrack AI v2 -- Setup do Banco de Dados SQL Server      " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Funcao para carregar variaveis de arquivo .env
function Load-EnvFile([string]$FilePath) {
    if (Test-Path $FilePath) {
        Write-Host ('[CONFIG] Carregando variaveis de: ' + $FilePath) -ForegroundColor Gray
        Get-Content $FilePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
                $parts = $line.Split('=', 2)
                $key = $parts[0].Trim()
                $val = $parts[1].Trim().Trim('"').Trim("'")
                [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
            }
        }
    }
}

$RootEnv = Join-Path $ScriptDir '..\.env'
$BackendEnv = Join-Path $ScriptDir '..\backend\.env'
$LocalEnv = Join-Path $ScriptDir '.env'

if (Test-Path $RootEnv) { Load-EnvFile $RootEnv }
if (Test-Path $BackendEnv) { Load-EnvFile $BackendEnv }
if (Test-Path $LocalEnv) { Load-EnvFile $LocalEnv }

# Define parametros finais
$dbServer = if ($Server) { $Server } elseif ($env:DB_SERVER) { $env:DB_SERVER } else { 'localhost\SQLEXPRESS' }
$dbName   = if ($Database) { $Database } elseif ($env:DB_NAME) { $env:DB_NAME } else { 'EduTrackAI' }
$dbAppUser = if ($AppUser) { $AppUser } elseif ($env:DB_APP_USER) { $env:DB_APP_USER } elseif ($env:DB_USER) { $env:DB_USER } else { 'edutrack_app' }
$dbAppPass = if ($AppPassword) { $AppPassword } elseif ($env:DB_APP_PASSWORD) { $env:DB_APP_PASSWORD } elseif ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" }
$dbPyUser  = if ($PyUser) { $PyUser } elseif ($env:DB_PY_USER) { $env:DB_PY_USER } else { 'edutrack_py_ro' }
$dbPyPass  = if ($PyPassword) { $PyPassword } elseif ($env:DB_PY_PASSWORD) { $env:DB_PY_PASSWORD } else { "" }

if (-not $dbAppPass) {
    Write-Host '[ERRO] Defina DB_PASSWORD ou DB_APP_PASSWORD no arquivo .env (ou passe via parametro -AppPassword).' -ForegroundColor Red
    exit 1
}

if (-not $dbPyPass) {
    Write-Host '[ERRO] Defina DB_PY_PASSWORD no arquivo .env (ou passe via parametro -PyPassword).' -ForegroundColor Red
    exit 1
}

Write-Host 'Configuracoes de Conexao:' -ForegroundColor White
Write-Host "  -> Servidor SQL:  $dbServer" -ForegroundColor Gray
Write-Host "  -> Banco Alvo:    $dbName" -ForegroundColor Gray
Write-Host "  -> Login App:     $dbAppUser" -ForegroundColor Gray
Write-Host "  -> Login Py RO:   $dbPyUser" -ForegroundColor Gray
Write-Host ''

# 2. Localizar sqlcmd.exe
$sqlcmdExe = 'sqlcmd'
if (-not (Get-Command 'sqlcmd' -ErrorAction SilentlyContinue)) {
    $commonPaths = @(
        'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
        'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe',
        'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\190\Tools\Binn\sqlcmd.exe',
        'C:\Program Files\Microsoft SQL Server\160\Tools\Binn\sqlcmd.exe',
        'C:\Program Files\Microsoft SQL Server\150\Tools\Binn\sqlcmd.exe',
        'C:\Program Files\Microsoft SQL Server\140\Tools\Binn\sqlcmd.exe'
    )
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $sqlcmdExe = $path
            break
        }
    }
}

if (-not (Get-Command $sqlcmdExe -ErrorAction SilentlyContinue) -and -not (Test-Path $sqlcmdExe)) {
    Write-Host '[ERRO] Utilitario sqlcmd nao encontrado no PATH ou locais padrao do SQL Server.' -ForegroundColor Red
    Write-Host 'Certifique-se de que o Microsoft SQL Server ou o Command Line Utilities esta instalado.' -ForegroundColor Yellow
    exit 1
}

Write-Host ('[OK] Usando utilitario: ' + $sqlcmdExe) -ForegroundColor Green
Write-Host ''

# 3. Execucao dos scripts SQL versionados em ordem
$sqlScripts = @(
    @{ File = '01_create_database.sql'; Desc = "1/7: Criacao do Banco de Dados $dbName"; UseVars = $false; Db = 'master' },
    @{ File = '02_create_logins.sql';   Desc = '2/7: Criacao dos Logins e Permissoes';   UseVars = $true;  Db = 'master' },
    @{ File = '03_schema.sql';          Desc = '3/7: Criacao das 9 Tabelas e Constraints'; UseVars = $false; Db = $dbName },
    @{ File = '04_indexes.sql';         Desc = '4/7: Criacao de Indices e Regra UX de Cronometro'; UseVars = $false; Db = $dbName },
    @{ File = '05_views.sql';           Desc = '5/7: Criacao das Views Analiticas';      UseVars = $false; Db = $dbName },
    @{ File = '06_seed_cursos.sql';     Desc = '6/7: Seed de Cursos de Graduacao';        UseVars = $false; Db = $dbName },
    @{ File = '07_seed_demo.sql';       Desc = '7/7: Seed do Aluno de Demonstracao (Demo)'; UseVars = $false; Db = $dbName }
)

foreach ($step in $sqlScripts) {
    $filePath = Join-Path $ScriptDir $step.File
    if (-not (Test-Path $filePath)) {
        Write-Host ('[ERRO] Arquivo nao encontrado: ' + $filePath) -ForegroundColor Red
        exit 1
    }

    Write-Host '------------------------------------------------------------------' -ForegroundColor DarkGray
    Write-Host ('[EXECUTANDO] ' + $step.Desc + '...') -ForegroundColor Cyan

    $argsList = @(
        '-S', $dbServer,
        '-E',
        '-C',
        '-d', $step.Db,
        '-i', $filePath,
        '-b'
    )

    if ($step.UseVars) {
        $argsList += @(
            '-v', "DB_APP_USER=$dbAppUser",
            '-v', "DB_APP_PASSWORD=$dbAppPass",
            '-v', "DB_PY_USER=$dbPyUser",
            '-v', "DB_PY_PASSWORD=$dbPyPass"
        )
    }

    $process = Start-Process -FilePath $sqlcmdExe -ArgumentList $argsList -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        Write-Host ('[FALHA] Erro ao executar ' + $step.File + ' (Exit code: ' + $process.ExitCode + ')') -ForegroundColor Red
        exit $process.ExitCode
    }
}

Write-Host '------------------------------------------------------------------' -ForegroundColor DarkGray
Write-Host ('[VALIDACAO] Testando autenticacao do login [' + $dbAppUser + ']...') -ForegroundColor Cyan

try {
    $valOutput = & $sqlcmdExe -S $dbServer -U $dbAppUser -P $dbAppPass -d $dbName -C -Q "SELECT 1 AS OK" -b 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host ('[SUCESSO] Login ' + $dbAppUser + ' autenticado com sucesso no banco ' + $dbName + '!') -ForegroundColor Green
    } else {
        Write-Host ('[AVISO] Nao foi possivel autenticar diretamente com o login ' + $dbAppUser + ': ' + $valOutput) -ForegroundColor Yellow
        Write-Host 'Verifique se a Autenticacao Mista (SQL Server and Windows Authentication mode) esta habilitada no seu SQL Server.' -ForegroundColor Yellow
    }
} catch {
    Write-Host ('[AVISO] Falha ao testar login: ' + $_.Exception.Message) -ForegroundColor Yellow
}

Write-Host ''
Write-Host '==================================================================' -ForegroundColor Green
Write-Host '   Banco de dados EduTrackAI configurado com sucesso!            ' -ForegroundColor Green
Write-Host '==================================================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Credenciais de demonstracao semeadas:' -ForegroundColor White
Write-Host '  -> Aluno Demo:  aluno@edutrack.ai' -ForegroundColor Yellow
Write-Host '  -> Senha Demo:  123456' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Para iniciar o projeto, execute:' -ForegroundColor White
Write-Host '  npm run dev' -ForegroundColor Cyan
Write-Host ''
