# Builds desktop/dist/MyMarathon.exe: web export with a same-origin API, then PyInstaller.
# Usage (from the repository root or anywhere): powershell -ExecutionPolicy Bypass -File desktop/build.ps1
$ErrorActionPreference = 'Stop'
$desktop = $PSScriptRoot
$app = Join-Path $desktop '..\app'

if (-not (Test-Path (Join-Path $desktop '.venv'))) {
    py -3.13 -m venv (Join-Path $desktop '.venv')
}
$python = Join-Path $desktop '.venv\Scripts\python.exe'
& $python -m pip install --quiet -r (Join-Path $desktop 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'pip install failed' }

Push-Location $app
try {
    # "/" becomes an empty base URL: the app calls the API on the same origin as the page.
    $env:EXPO_PUBLIC_API_URL = '/'
    npx expo export --platform web --output-dir dist-desktop --clear
    if ($LASTEXITCODE -ne 0) { throw 'expo export failed' }
} finally {
    Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
    Pop-Location
}

Push-Location $desktop
try {
    & $python -m PyInstaller --noconfirm --clean MyMarathon.spec
    if ($LASTEXITCODE -ne 0) { throw 'PyInstaller failed' }
} finally {
    Pop-Location
}
Write-Host "OK: $(Join-Path $desktop 'dist\MyMarathon.exe')"
