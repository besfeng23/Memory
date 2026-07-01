# Firebase MCP setup for Claude Desktop (Windows RDP)

Sets up the **official Firebase CLI MCP server** so Claude Desktop can use Firebase
against project **`memory-f6a9d`** (App Hosting backend `memory-app`).

- Uses **only** the official Firebase CLI MCP: `firebase-tools@latest` with the `mcp` command.
- **No community / unofficial Firebase MCP packages.**
- **No secrets in the Claude config**: no `SUPABASE_SERVICE_ROLE_KEY`, no `POSTGRES_URL`,
  no Firebase tokens, no Google credential JSON. The Firebase MCP server authenticates
  via your interactive `firebase login` session.

## TL;DR

From an elevated (or normal) PowerShell on the Windows RDP box:

```powershell
# one-time: allow running the local script
powershell -ExecutionPolicy Bypass -File .\scripts\setup-firebase-mcp-windows.ps1
```

The script does Steps 1, 2, 4, 5, 6, 7 automatically and **merges** into any existing
`claude_desktop_config.json` (it never overwrites your other MCP servers, and it backs
up the file first). Steps 3 (login), 8 (restart), and 9 (test) are manual by design.

If the script reports Node or Git were just installed, **close and reopen PowerShell**,
then re-run it.

---

## Manual steps (what the script cannot do)

### Step 3 — Authenticate Firebase

```powershell
firebase login --no-localhost
```

Open the printed URL in a browser, sign in with the Google account that owns/accesses
`memory-f6a9d`, and paste the authorization code back. Then confirm:

```powershell
firebase projects:list   # memory-f6a9d must appear
```

> Do **not** paste the auth code, tokens, or any credentials into chat.

### Step 8 — Restart Claude Desktop

Fully quit Claude Desktop from the **system tray** (not just the window), then start it again.
MCP servers are only loaded at launch.

### Step 9 — Test inside Claude

Ask Claude:

> "Use Firebase MCP to list my Firebase projects and inspect project `memory-f6a9d`."

**Pass condition:** Claude shows Firebase tools and can list/inspect `memory-f6a9d`.

---

## The config that gets written

Location: `%APPDATA%\Claude\claude_desktop_config.json`

The `firebase` entry (existing servers preserved):

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx.cmd",
      "args": [
        "-y",
        "firebase-tools@latest",
        "mcp",
        "--dir",
        "C:\\Users\\<YOUR_USER>\\Memory"
      ]
    }
  }
}
```

`--dir` is set to your resolved repo path (`Resolve-Path "$env:USERPROFILE\Memory"`) so the
server auto-detects the Firebase project from the repo. Do **not** add `--tools` or `--only`
unless auto-detection fails. Do **not** add service-account JSON paths without explicit approval.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `node` / `git` not found after winget install | Close PowerShell, open a new window, re-run the script. |
| `firebase mcp --help` fails | Script auto-falls back to `firebase experimental:mcp --help`, then `npx -y firebase-tools@latest mcp --help`. If all fail: update firebase-tools and retry. **Do not** install an unofficial package. |
| `memory-f6a9d` not in `projects:list` | You signed in with the wrong Google account. Re-run `firebase login --no-localhost`. |
| Firebase tools don't appear in Claude | Confirm you fully quit Claude from the tray before relaunch; re-check the config with Step 7 validation. |
| Existing config was invalid JSON | Script aborts before writing and leaves a `.bak` backup. Fix the JSON and re-run. |

## Verifying the config safely (no secrets printed)

```powershell
$configPath = Join-Path $env:APPDATA "Claude\claude_desktop_config.json"
Get-Content $configPath -Raw | ConvertFrom-Json | Out-Null; "JSON valid"
(Get-Content $configPath -Raw | ConvertFrom-Json).mcpServers.PSObject.Properties.Name
```

This prints only server **names**, never argument values or secrets.
