# msg-timestamps

A Claude Code mod that shows the local time before each assistant reply block in the terminal transcript, for example `● [14:02:43] Fixed: ...`.

The time is when the first chunk of that block arrived. The timezone comes from the system (`date +%z`).

## Load

Every session: add this folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`.
One session: `claude --plugin-dir ~/Documents/dev/claude-msg-timestamps`.

## Check

```
claude plugin validate .
claude plugin test .
```

## Limits

- Only replies streamed in the current session get a time. Resumed history shows none.
- The match is by text, so two identical blocks show the same time.
