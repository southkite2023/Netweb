$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $projectDir 'dist'
$serverDir = Join-Path $projectDir 'server'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$localArchive = Join-Path $env:TEMP "yuashie-dist-$stamp.tar.gz"
$localServerArchive = Join-Path $env:TEMP "yuashie-server-$stamp.tar.gz"
$remoteArchive = "/tmp/yuashie-dist-$stamp.tar.gz"
$remoteServerArchive = "/tmp/yuashie-server-$stamp.tar.gz"
$appDir = '/var/www/yuashie-app'
$remoteNew = "$appDir/dist-new-$stamp"
$remoteOld = "$appDir/dist-old-$stamp"
$remoteBackup = "$appDir/backups/dist-$stamp.tar.gz"
$remoteServerBackup = "$appDir/backups/server-$stamp.tar.gz"
$locationPushed = $false

try {
  if (-not (Test-Path -LiteralPath (Join-Path $projectDir 'package.json'))) {
    throw 'Project not found.'
  }

  if (-not (Test-Path -LiteralPath (Join-Path $serverDir 'src/index.js'))) {
    throw 'Server source not found.'
  }

  Push-Location $projectDir
  $locationPushed = $true

  Write-Host '[1/8] Building website...' -ForegroundColor Cyan
  & npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed with exit code $LASTEXITCODE."
  }

  if (-not (Test-Path -LiteralPath (Join-Path $distDir 'index.html'))) {
    throw 'Build output dist/index.html was not created.'
  }

  Write-Host '[2/8] Packaging frontend...' -ForegroundColor Cyan
  & tar -czf $localArchive -C $distDir .
  if ($LASTEXITCODE -ne 0) {
    throw "Frontend packaging failed with exit code $LASTEXITCODE."
  }

  Write-Host '[3/8] Packaging account API...' -ForegroundColor Cyan
  & tar -czf $localServerArchive -C $serverDir src sql package.json .env.example
  if ($LASTEXITCODE -ne 0) {
    throw "Server packaging failed with exit code $LASTEXITCODE."
  }

  Write-Host '[4/8] Uploading frontend and API...' -ForegroundColor Cyan
  & scp $localArchive $localServerArchive "yuashie:/tmp/"
  if ($LASTEXITCODE -ne 0) {
    throw "Upload failed with exit code $LASTEXITCODE."
  }

  $remoteScript = @"
set -eu
mkdir -p '$remoteNew' '$appDir/backups'

# Update API source while preserving the production .env and node_modules.
tar -czf '$remoteServerBackup' -C '$appDir/server' src sql package.json 2>/dev/null || true
server_tmp='/tmp/yuashie-server-unpack-$stamp'
rm -rf "`$server_tmp"
mkdir -p "`$server_tmp"
tar -xzf '$remoteServerArchive' -C "`$server_tmp"
rm -rf '$appDir/server/src' '$appDir/server/sql'
cp -a "`$server_tmp/src" '$appDir/server/src'
cp -a "`$server_tmp/sql" '$appDir/server/sql'
cp "`$server_tmp/package.json" '$appDir/server/package.json'
cp "`$server_tmp/.env.example" '$appDir/server/.env.example'
rm -rf "`$server_tmp"
rm -f '$remoteServerArchive'

# All migrations are idempotent. Apply them in filename order so both existing
# installations and fresh servers converge to the same 0.2.4 schema.
set -a
. '$appDir/server/.env'
set +a
for migration in '$appDir/server'/sql/*.sql; do
  psql "`$DATABASE_URL" -v ON_ERROR_STOP=1 -f "`$migration"
done

# Avatars live outside the deployed source tree so frontend/API updates never
# overwrite user content. The API service runs as www-data.
mkdir -p '$appDir/user-content/avatars'
chown -R www-data:www-data '$appDir/user-content'
chmod 750 '$appDir/user-content' '$appDir/user-content/avatars'

if ! systemctl restart yuashie-api; then
  echo 'API restart failed; restoring previous API source.' >&2
  rm -rf '$appDir/server/src' '$appDir/server/sql'
  tar -xzf '$remoteServerBackup' -C '$appDir/server'
  systemctl restart yuashie-api || true
  exit 1
fi
sleep 1
if ! curl -fsS 'http://127.0.0.1:3000/api/health' >/dev/null; then
  echo 'API health check failed; restoring previous API source.' >&2
  rm -rf '$appDir/server/src' '$appDir/server/sql'
  tar -xzf '$remoteServerBackup' -C '$appDir/server'
  systemctl restart yuashie-api || true
  exit 1
fi

# Deploy frontend only after the API and migration are healthy.
tar -xzf '$remoteArchive' -C '$remoteNew'
test -f '$remoteNew/index.html'
tar -czf '$remoteBackup' -C '$appDir/dist' .
mv '$appDir/dist' '$remoteOld'
if mv '$remoteNew' '$appDir/dist'; then
  rm -rf -- '$remoteOld'
  rm -f -- '$remoteArchive'
else
  mv '$remoteOld' '$appDir/dist'
  exit 1
fi
"@

  $remotePayload = [Convert]::ToBase64String(
    [Text.Encoding]::UTF8.GetBytes($remoteScript)
  )

  Write-Host '[5/8] Updating database and account API...' -ForegroundColor Cyan
  & ssh yuashie "echo '$remotePayload' | base64 -d | bash"
  if ($LASTEXITCODE -ne 0) {
    throw "Remote deployment failed with exit code $LASTEXITCODE."
  }

  Write-Host '[6/8] Checking account API...' -ForegroundColor Cyan
  try {
    $apiResponse = Invoke-RestMethod -Uri 'https://yuashie.cn/api/health' -Method Get -TimeoutSec 15
    if (-not $apiResponse.ok) {
      throw 'API health check returned an unexpected response.'
    }
  }
  catch {
    throw "API check failed: $($_.Exception.Message)"
  }

  Write-Host '[7/8] Checking website...' -ForegroundColor Cyan
  try {
    Invoke-WebRequest -Uri 'https://yuashie.cn/' -Method Head -UseBasicParsing -TimeoutSec 15 | Out-Null
  }
  catch {
    Write-Host 'Deployment completed, but the homepage check did not respond in time.' -ForegroundColor Yellow
  }

  Write-Host '[8/8] Publish completed successfully.' -ForegroundColor Green
  Write-Host "Frontend backup: $remoteBackup"
  Write-Host "Server backup:   $remoteServerBackup"
  Start-Process 'https://yuashie.cn/'
}
catch {
  Write-Host ''
  Write-Host "Publish failed: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
  if ($locationPushed) {
    Pop-Location
  }

  foreach ($archive in @($localArchive, $localServerArchive)) {
    if (Test-Path -LiteralPath $archive) {
      Remove-Item -LiteralPath $archive -Force
    }
  }
}

Read-Host 'Press Enter to close'
