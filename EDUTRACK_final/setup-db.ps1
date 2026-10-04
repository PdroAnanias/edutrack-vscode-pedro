# ============================================================================
# EduTrack AI v2 - setup-db.ps1 (Raiz)
# Atalho para executar database/setup-db.ps1
# ============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ScriptDir "database\setup-db.ps1") @args
