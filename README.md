# msg-timestamps

A Claude Code mod that shows the local time before your prompts and each assistant reply block in the terminal transcript:

```
❯ [14:02:30] fix the login bug
● **[14:02:43]** Fixed: ...
```

A prompt's time is when you sent it, in plain text (prompt rows do not render markdown). A reply's time is in bold and is when the first chunk of that block arrived. The timezone comes from the system (`date +%z`).

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
- The match is by text, so two identical blocks (or two identical prompts) show the same time.
- A prompt with pasted text may show no time, because the stamp is keyed by the expanded text.
