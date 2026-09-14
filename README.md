# pi-extensions

My custom [pi coding agent](https://github.com/earendil-works/pi) extensions, packaged as a [pi package](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md).

| Extension | What it does |
|---|---|
| [tps](extensions/tps.ts) | Real-time tok/s + TTFT in the footer during generation, run stats on finish |

## Install

```bash
pi install git:github.com/laterya/pi-extensions
```

Or try without installing:

```bash
pi -e git:github.com/laterya/pi-extensions
```

Reload pi — no config needed. (Until published to npm; then `pi install npm:@laterya/pi-extensions`.)

## tps

- **During generation** (footer): `TTFT 0.8s | 45.2 tok/s` — TTFT is request → first delta; rate measured from first delta onward (TTFT excluded)
- **On message end**: exact rate from usage, plus total output tokens
- **On run end** (notification): LLM call count, output tokens @ pure LLM throughput, LLM vs wall-clock split, input tokens, cache read/write

| Event | Use |
|---|---|
| `before_provider_request` | start TTFT timer |
| `message_update` | count deltas (~1 token each), paint throttled live rate |
| `message_end` | correct to exact `usage.output`, accumulate pure streaming time |
| `agent_start` / `agent_end` | run-level aggregate + notify |

Live token count is an estimate (delta events ≈ tokens) until `message_end` delivers exact usage.

## Add a new extension

Drop `extensions/name.ts` and add a row/section above.

## Development

```bash
npm install        # dev deps: TypeScript + pi type packages (not installed by consumers)
npm run typecheck  # strict typecheck of extensions/
```

CI runs the typecheck on every push and PR.

## License

MIT
