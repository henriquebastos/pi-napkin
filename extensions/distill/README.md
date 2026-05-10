# napkin-distill

Pi extension that automatically distills knowledge from conversations into your napkin vault.

## How it works

1. Runs on a configurable interval (default: 60 minutes)
2. Checks if the conversation changed since last distill
3. Sends the new conversation to a model
4. The model extracts structured notes using your vault's templates
5. Notes are written directly into the vault

## Setup

Enable distill in your vault config:

```bash
napkin config set --key distill.enabled --value true
```

Or edit `.napkin/config.json` directly:

```json
{
  "distill": {
    "enabled": true,
    "intervalMinutes": 60,
    "model": {
      "provider": "anthropic",
      "id": "claude-sonnet-4-6"
    }
  }
}
```

## Configuration

All distill settings live in `.napkin/config.json` under the `distill` key:

| Field | Default | Description |
|-------|---------|-------------|
| `distill.enabled` | `false` | Enable automatic distillation |
| `distill.intervalMinutes` | `60` | How often to check for new content |
| `distill.model.provider` | `"anthropic"` | LLM provider |
| `distill.model.id` | `"claude-sonnet-4-6"` | Model for distillation |
| `distill.prompt` | unset | Inline prompt override. Takes precedence over `promptPath`. |
| `distill.promptPath` | unset | Prompt file path. Relative paths resolve from the vault root, not `.napkin/`. |

Example custom prompt path:

```json
{
  "distill": {
    "enabled": false,
    "promptPath": "shared/design/Napkin Distill Prompt.md"
  }
}
```

## Manual trigger

Use `/distill` in pi to manually trigger distillation of the full conversation.
