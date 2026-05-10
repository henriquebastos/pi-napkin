# pi-napkin

🧻 [Napkin](https://github.com/Michaelliv/napkin) integration for [pi](https://github.com/badlogic/pi-mono).

## Install

```bash
npm i -g napkin-ai
pi install npm:pi-napkin
```

## What you get

### Extensions

**napkin-context** — On session start, injects the vault overview into the agent's context. Registers two tools:

- `kb_search` — Search the vault by keyword or topic
- `kb_read` — Read a note from the vault by name or path

**napkin-distill** — Automatic knowledge distillation. Runs on a timer (default: 60 min), forks the conversation, and uses a cheap model to extract structured notes into the vault. `/distill` triggers it manually.

### Skill

The `napkin` skill gives the agent full CLI reference for napkin — all commands, flags, and patterns.

## Vault resolution

Both extensions read `~/.pi/agent/napkin.json` for the default vault path and optional resolution mode:

```json
// ~/.pi/agent/napkin.json
{
  "vault": "~/.pi/agent/kb",
  "resolution": "bounded"
}
```

Resolution modes:

| Mode | Behavior |
|------|----------|
| `nearest` | Current/legacy behavior: walk up from cwd looking for the nearest `.napkin/`, then fall back to the configured vault. |
| `fixed` | Always use the configured vault. Do not walk parent directories. |
| `bounded` | Walk up from cwd for project-local `.napkin/`, but stop at the git root or before `$HOME`; then fall back to the configured vault. |

If `resolution` is omitted, `nearest` is used for backward compatibility. Use `fixed` for a single personal KB, or `bounded` when you want project-local vaults without accidentally treating `$HOME` as a vault.

## Distillation config

Enable distillation in the vault's `.napkin/config.json`:

```bash
napkin --vault ~/.pi/agent/kb config set --key distill.enabled --value true
```

| Setting | Default | Description |
|---------|---------|-------------|
| `distill.enabled` | `false` | Enable automatic distillation |
| `distill.intervalMinutes` | `60` | Timer interval |
| `distill.model.provider` | `"anthropic"` | Model provider |
| `distill.model.id` | `"claude-sonnet-4-6"` | Model for distillation |
| `distill.prompt` | unset | Inline prompt override. Takes precedence over `promptPath`. |
| `distill.promptPath` | unset | Prompt file path. Relative paths resolve from the vault root, not `.napkin/`. |

Example:

```json
{
  "distill": {
    "enabled": false,
    "promptPath": "shared/design/Napkin Distill Prompt.md"
  }
}
```

`/distill` can still be used manually when automatic distillation is disabled.

Each distillation writes a run log under `.napkin/distill-runs/<timestamp>/` with `metadata.json`, `prompt.md`, `stdout.md`, `stderr.log`, `exit-code.txt`, and `completed-at.txt`. Check `stdout.md` for the notes-created/updated/skipped summary from the distillation model.

## License

MIT
