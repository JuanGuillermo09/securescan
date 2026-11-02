# ============================================================================
# EVIDENCIA DE REPARTO DE CARGA (NGINX -> api-1 / api-2 / api-3)
# ----------------------------------------------------------------------------
# Hace 12 peticiones consecutivas a /api/health y guarda la cabecera
# X-Node-Id de cada una. Sirve como evidencia de que NGINX reparte entre las
# tres réplicas.
#
# Uso (desde la raíz del repo, con el stack de 3 nodos levantado):
#   powershell -ExecutionPolicy Bypass -File loadtest/evidence-x-node-id.ps1
# ============================================================================

$ErrorActionPreference = 'Stop'

$url = 'http://localhost:8080/api/health'
$out = Join-Path $PSScriptRoot 'results/X_node_id.txt'
$lines = @()
$counts = @{}

$lines += "Fecha: $(Get-Date -Format o)"
$lines += "Objetivo: $url"
$lines += "Comando: 12 x Invoke-WebRequest -UseBasicParsing $url"
$lines += ""

for ($i = 1; $i -le 12; $i++) {
  $r = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 10
  $node = $r.Headers['X-Node-Id']
  $body = $r.Content | ConvertFrom-Json
  $line = "peticion $i : X-Node-Id=$node body.node=$($body.node) queueMode=$($body.queueMode)"
  $lines += $line
  Write-Output $line

  if ($counts.ContainsKey($node)) {
    $counts[$node]++
  } else {
    $counts[$node] = 1
  }
}

$lines += ""
$lines += "Resumen:"
foreach ($k in ($counts.Keys | Sort-Object)) {
  $lines += "  $k = $($counts[$k])"
  Write-Output "  $k = $($counts[$k])"
}

[System.IO.File]::WriteAllLines($out, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Evidencia guardada en $out"
