# Builds the web app (same-origin API) and pushes it to the web-build branch, pulled by PythonAnywhere.
# Usage (from the repository root or anywhere): powershell -ExecutionPolicy Bypass -File deploy/publish-web.ps1
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$out = Join-Path $env:TEMP 'mymarathon-web-build'
if (Test-Path $out) { Remove-Item -Recurse -Force $out }

Push-Location (Join-Path $root 'app')
try {
    # "/" becomes an empty base URL: the app calls the API on the same origin as the page.
    $env:EXPO_PUBLIC_API_URL = '/'
    npx expo export --platform web --output-dir $out --clear
    if ($LASTEXITCODE -ne 0) { throw 'expo export failed' }
} finally {
    Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
    Pop-Location
}

$remote = git -C $root remote get-url origin
$commit = git -C $root rev-parse --short HEAD
Push-Location $out
try {
    # A one-commit branch: only the latest build is kept.
    git init --quiet --initial-branch web-build
    git add --all
    git commit --quiet --message "Web build of $commit"
    git push --force $remote web-build
    if ($LASTEXITCODE -ne 0) { throw 'git push failed' }
} finally {
    Pop-Location
}
Write-Host "OK: web-build = $commit. On PythonAnywhere: bash ~/MyMarathon/deploy/pythonanywhere/update.sh"
