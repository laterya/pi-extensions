# pi-tps-extension

A [pi coding agent](https://github.com/earendil-works/pi-coding-agent) extension that shows **real-time tokens-per-second** in the footer while the model streams.

## What it shows

- **During generation** (footer status line): `TTFT 0.8s | 45.2 tok/s`
  - **TTFT**: time to first token (request → first delta)
  - **tok/s**: streaming rate measured from the first delta onward (TTFT excluded)
- **On message end**: exact rate from usage, plus total output tokens
- **On run end** (notification): aggregate stats — LLM call count, output tokens @ pure LLM throughput, LLM vs wall-clock time split, input tokens, cache read/write

## Install

```bash
cp tps.ts ~/.pi/agent/extensions/tps.ts
```

Reload pi and it's active — no config needed.

## How it works

| Event | Use |
|---|---|
| `before_provider_request` | start TTFT timer |
| `message_update` | count deltas (~1 token each), paint throttled live rate |
| `message_end` | correct to exact `usage.output`, accumulate pure streaming time |
| `agent_start` / `agent_end` | run-level aggregate + notify |

Live token count is an estimate (delta events ≈ tokens) until `message_end` delivers exact usage.

## License

MIT
