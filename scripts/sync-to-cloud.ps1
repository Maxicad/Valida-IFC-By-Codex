$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

git fetch origin main

$status = git status --porcelain
if (-not $status) {
  Write-Host 'Nada para sincronizar. Workspace limpo.'
  exit 0
}

git add -A
$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Host 'Nada versionavel para sincronizar.'
  exit 0
}

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
git commit -m "Auto-sync local workspace $stamp"
git push origin main

Write-Host 'Sincronizacao concluida. O GitHub Pages publicara a branch main automaticamente.'
