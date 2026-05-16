$ErrorActionPreference = 'Stop'

$repo = 'C:\MaxiCAD_Projetos_IA\01_Maxi_IFC_Codex'

if (-not (Test-Path -LiteralPath $repo)) {
  throw "Pasta do projeto nao encontrada: $repo"
}

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
