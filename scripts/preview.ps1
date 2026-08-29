$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$packageFile = Join-Path $projectDir 'package.json'

if (-not (Test-Path -LiteralPath $packageFile)) {
  Write-Host 'Project not found.' -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}

$devCommand = "title Yuashie Preview && cd /d `"$projectDir`" && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $devCommand

$previewUrl = 'http://127.0.0.1:5173/'

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 1
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      Start-Process $previewUrl
      exit 0
    }
  }
  catch {
    Start-Sleep -Seconds 1
  }
}

Write-Host 'Preview did not become ready within 30 seconds.' -ForegroundColor Yellow
Write-Host 'Check the Yuashie Preview command window for details.'
Read-Host 'Press Enter to close'
exit 1
