<#
.SYNOPSIS
    Install and configure the OFFICIAL Firebase CLI MCP server for Claude Desktop on Windows.

.DESCRIPTION
    Automates the safe parts of the Firebase MCP setup for the Memory project:
      1. Checks prerequisites (Node LTS, npm, npx, Git, Firebase CLI)
      2. Installs / updates firebase-tools@latest
      3. Confirms the official Firebase CLI MCP command exists
      4. Clones or updates the Memory repo and selects project memory-f6a9d
      5. Backs up and MERGES the "firebase" server into claude_desktop_config.json
         (existing MCP servers are preserved)
      6. Validates the resulting JSON

    This script uses ONLY the official Firebase CLI MCP server (firebase-tools@latest, `mcp`).
    It does NOT install community Firebase MCP packages.

    SECURITY:
      - No secrets are written to the Claude config.
      - No SUPABASE_SERVICE_ROLE_KEY, POSTGRES_URL, Firebase tokens, or Google
        credentials are ever printed or stored by this script.
      - The Firebase MCP server authenticates via your interactive `firebase login`
        session, not via keys in the config file.

    MANUAL STEPS (cannot be automated, by design):
      - Firebase interactive Google sign-in (Step 3)
      - Fully quitting and restarting Claude Desktop (Step 8)
      - Verifying tools inside Claude Desktop (Step 9)

.PARAMETER RepoPath
    Where the Memory repo lives / should be cloned. Default: $env:USERPROFILE\Memory

.PARAMETER SkipInstall
    Skip winget/npm install attempts; only verify + configure.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\setup-firebase-mcp-windows.ps1
#>

[CmdletBinding()]
param(
    [string]$RepoPath = (Join-Path $env:USERPROFILE "Memory"),
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$ProjectId = "memory-f6a9d"

function Write-Section($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Write-Ok($t)      { Write-Host "  [OK]   $t" -ForegroundColor Green }
function Write-Warn2($t)   { Write-Host "  [WARN] $t" -ForegroundColor Yellow }
function Write-Fail($t)    { Write-Host "  [FAIL] $t" -ForegroundColor Red }

function Test-Cmd($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# Recursively convert a ConvertFrom-Json result (PSCustomObject) into a
# hashtable so we can merge safely. Works on Windows PowerShell 5.1 (which
# lacks 'ConvertFrom-Json -AsHashtable') as well as PowerShell 7+.
function ConvertTo-HashtableDeep($obj) {
    if ($null -eq $obj) { return $null }
    if ($obj -is [System.Collections.IDictionary]) {
        $h = @{}
        foreach ($k in $obj.Keys) { $h[$k] = ConvertTo-HashtableDeep $obj[$k] }
        return $h
    }
    if ($obj -is [PSCustomObject]) {
        $h = @{}
        foreach ($p in $obj.PSObject.Properties) { $h[$p.Name] = ConvertTo-HashtableDeep $p.Value }
        return $h
    }
    if ($obj -is [System.Collections.IEnumerable] -and $obj -isnot [string]) {
        return @($obj | ForEach-Object { ConvertTo-HashtableDeep $_ })
    }
    return $obj
}

# ---------------------------------------------------------------------------
# Step 1 - Prerequisites
# ---------------------------------------------------------------------------
Write-Section "Step 1: Checking prerequisites"

$needRestart = $false

if (Test-Cmd node) {
    Write-Ok "node $(node -v)"
} else {
    Write-Warn2 "Node.js not found."
    if (-not $SkipInstall -and (Test-Cmd winget)) {
        Write-Host "  Installing Node.js LTS via winget..."
        winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        $needRestart = $true
    } else {
        Write-Fail "Install Node LTS manually: winget install OpenJS.NodeJS.LTS"
    }
}

if (Test-Cmd npm)  { Write-Ok "npm $(npm -v)" }  else { Write-Warn2 "npm not found (comes with Node)." }
if (Test-Cmd npx)  { Write-Ok "npx present" }     else { Write-Warn2 "npx not found (comes with Node)." }

if (Test-Cmd git) {
    Write-Ok "$(git --version)"
} else {
    Write-Warn2 "Git not found."
    if (-not $SkipInstall -and (Test-Cmd winget)) {
        Write-Host "  Installing Git via winget..."
        winget install --id Git.Git --accept-source-agreements --accept-package-agreements
        $needRestart = $true
    } else {
        Write-Fail "Install Git manually: winget install Git.Git"
    }
}

if ($needRestart) {
    Write-Warn2 "Node and/or Git were just installed."
    Write-Warn2 "CLOSE this PowerShell window, open a NEW one, and re-run this script."
    exit 2
}

# ---------------------------------------------------------------------------
# Step 2 - Firebase CLI + MCP support
# ---------------------------------------------------------------------------
Write-Section "Step 2: Firebase CLI (official) + MCP support"

if (-not $SkipInstall) {
    Write-Host "  Installing/updating firebase-tools@latest (global)..."
    npm install -g firebase-tools@latest
}

if (Test-Cmd firebase) {
    Write-Ok "firebase $(firebase --version)"
} else {
    Write-Fail "Firebase CLI not found after install. Open a new shell and re-run, or check npm global PATH."
    exit 1
}

$mcpOk = $false
Write-Host "  Probing: firebase mcp --help"
try {
    $helpOut = & firebase mcp --help 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) { $mcpOk = $true; Write-Ok "'firebase mcp' is supported." }
} catch { }

if (-not $mcpOk) {
    Write-Warn2 "'firebase mcp --help' failed; trying 'firebase experimental:mcp --help'..."
    try {
        $helpOut = & firebase experimental:mcp --help 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) { $mcpOk = $true; Write-Ok "'firebase experimental:mcp' is supported." }
    } catch { }
}

if (-not $mcpOk) {
    Write-Warn2 "Direct probes failed; trying 'npx -y firebase-tools@latest mcp --help'..."
    try {
        $helpOut = & npx -y firebase-tools@latest mcp --help 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) { $mcpOk = $true; Write-Ok "npx firebase-tools mcp is supported." }
    } catch { }
}

if (-not $mcpOk) {
    Write-Fail "The official Firebase CLI MCP command was not found."
    Write-Fail "STOP. Do NOT substitute an unofficial Firebase MCP package."
    Write-Fail "Update firebase-tools and retry, or report this back."
    exit 1
}

# ---------------------------------------------------------------------------
# Step 3 - Authentication (interactive; guidance only)
# ---------------------------------------------------------------------------
Write-Section "Step 3: Firebase authentication (MANUAL)"
$loggedIn = $false
try {
    $projJson = & firebase projects:list --json 2>$null | Out-String
    if ($projJson -match $ProjectId) { $loggedIn = $true }
} catch { }

if ($loggedIn) {
    Write-Ok "Already authenticated and project '$ProjectId' is visible."
} else {
    Write-Warn2 "Not authenticated (or '$ProjectId' not visible yet)."
    Write-Host  "  Run this yourself, then re-run the script:" -ForegroundColor Yellow
    Write-Host  "      firebase login --no-localhost" -ForegroundColor White
    Write-Host  "  Open the printed URL in a browser, sign in with the Google account"
    Write-Host  "  that owns/accesses '$ProjectId', paste the auth code back, then verify:"
    Write-Host  "      firebase projects:list" -ForegroundColor White
    Write-Warn2 "Continuing with repo + config setup; auth can be completed anytime before restart."
}

# ---------------------------------------------------------------------------
# Step 4 - Clone / update repo, select project
# ---------------------------------------------------------------------------
Write-Section "Step 4: Memory repo at $RepoPath"

if (-not (Test-Path $RepoPath)) {
    Write-Host "  Cloning repo..."
    git clone https://github.com/besfeng23/Memory.git $RepoPath
} else {
    Write-Ok "Repo already present."
}

Push-Location $RepoPath
try {
    Write-Host "  git pull origin main"
    try { git pull origin main } catch { Write-Warn2 "git pull failed (offline or non-main default?). Continuing." }

    if ($loggedIn) {
        Write-Host "  firebase use $ProjectId"
        try { firebase use $ProjectId } catch { Write-Warn2 "'firebase use' failed; complete auth first." }
    } else {
        Write-Warn2 "Skipping 'firebase use' until authenticated."
    }

    Write-Ok "Working dir: $(Get-Location)"
    git status --short
} finally {
    Pop-Location
}

$resolvedRepo = (Resolve-Path $RepoPath).Path
Write-Ok "Resolved repo path for MCP --dir: $resolvedRepo"

# ---------------------------------------------------------------------------
# Step 5 - Locate + back up Claude Desktop config
# ---------------------------------------------------------------------------
Write-Section "Step 5: Claude Desktop config"

$claudeDir  = Join-Path $env:APPDATA "Claude"
$configPath = Join-Path $claudeDir "claude_desktop_config.json"
New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null

if (Test-Path $configPath) {
    $backup = "$configPath.bak.$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item $configPath $backup
    Write-Ok "Backed up existing config -> $backup"
} else {
    Write-Warn2 "No existing config; a new one will be created."
}

# ---------------------------------------------------------------------------
# Step 6 - Merge the firebase MCP server (preserve existing servers)
# ---------------------------------------------------------------------------
Write-Section "Step 6: Merge 'firebase' MCP server"

# Load existing config as an ordered hashtable so we can merge without clobbering.
$config = $null
if (Test-Path $configPath) {
    $raw = Get-Content $configPath -Raw
    if ($raw -and $raw.Trim().Length -gt 0) {
        try {
            $config = ConvertTo-HashtableDeep ($raw | ConvertFrom-Json)
        } catch {
            Write-Fail "Existing config is not valid JSON. Fix or remove it (a backup was made). Aborting."
            exit 1
        }
    }
}
if ($null -eq $config) { $config = @{} }
if (-not $config.ContainsKey("mcpServers") -or $null -eq $config["mcpServers"]) {
    $config["mcpServers"] = @{}
}

$existingNames = @($config["mcpServers"].Keys)
if ($existingNames.Count -gt 0) {
    Write-Ok "Preserving existing MCP servers: $($existingNames -join ', ')"
}

# Official Firebase CLI MCP server entry. No secrets. --dir scopes it to the repo.
$config["mcpServers"]["firebase"] = @{
    command = "npx.cmd"
    args    = @("-y", "firebase-tools@latest", "mcp", "--dir", $resolvedRepo)
}

$json = $config | ConvertTo-Json -Depth 20
Set-Content -Path $configPath -Value $json -Encoding UTF8
Write-Ok "Wrote 'firebase' MCP server to config."

# ---------------------------------------------------------------------------
# Step 7 - Validate JSON + list server names (no secrets)
# ---------------------------------------------------------------------------
Write-Section "Step 7: Validate config"
try {
    $reloaded = Get-Content $configPath -Raw | ConvertFrom-Json
    Write-Ok "Claude config JSON is valid."
    Write-Host "  Configured MCP server names:"
    $reloaded.mcpServers.PSObject.Properties.Name | ForEach-Object { Write-Host "    - $_" }
} catch {
    Write-Fail "Resulting JSON failed to parse. Restore from the .bak file. Aborting."
    exit 1
}

# ---------------------------------------------------------------------------
# Steps 8-10 - Manual finish
# ---------------------------------------------------------------------------
Write-Section "Next (manual)"
Write-Host "  8. Fully QUIT Claude Desktop from the system tray, then start it again."
Write-Host "  9. In Claude, ask:"
Write-Host "       'Use Firebase MCP to list my Firebase projects and inspect project $ProjectId.'"
Write-Host " 10. Confirm Firebase tools appear and '$ProjectId' is accessible."
Write-Host ""
Write-Host "  Config file edited: $configPath" -ForegroundColor White
Write-Host "  Reminder: never add SUPABASE_SERVICE_ROLE_KEY, POSTGRES_URL, tokens," -ForegroundColor Yellow
Write-Host "  or service-account JSON to this config." -ForegroundColor Yellow
Write-Ok "Done."
