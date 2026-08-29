$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$desktopDir = [Environment]::GetFolderPath('Desktop')
$powerShellExe = Join-Path $PSHOME 'powershell.exe'
$codeIcon = 'D:\Microsoft VS Code\Code.exe'
$fallbackIcon = "$powerShellExe,0"

function New-YuashieShortcut {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,

    [Parameter(Mandatory = $true)]
    [string]$Description
  )

  if (-not (Test-Path -LiteralPath $ScriptPath)) {
    throw "Script not found: $ScriptPath"
  }

  $shell = New-Object -ComObject WScript.Shell
  $shortcutPath = Join-Path $desktopDir "$Name.lnk"
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $powerShellExe
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
  $shortcut.WorkingDirectory = $projectDir
  $shortcut.Description = $Description
  $shortcut.WindowStyle = 1

  if (Test-Path -LiteralPath $codeIcon) {
    $shortcut.IconLocation = "$codeIcon,0"
  }
  else {
    $shortcut.IconLocation = $fallbackIcon
  }

  $shortcut.Save()
  return $shortcutPath
}

$previewShortcut = New-YuashieShortcut `
  -Name 'Yuashie Preview' `
  -ScriptPath (Join-Path $PSScriptRoot 'preview.ps1') `
  -Description 'Preview the Yuashie website locally'

$publishShortcut = New-YuashieShortcut `
  -Name 'Yuashie Publish' `
  -ScriptPath (Join-Path $PSScriptRoot 'publish.ps1') `
  -Description 'Build and publish the Yuashie website'

Write-Host 'Desktop shortcuts created:' -ForegroundColor Green
Write-Host $previewShortcut
Write-Host $publishShortcut
Read-Host 'Press Enter to close'
