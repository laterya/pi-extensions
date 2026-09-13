# pi-extensions

My custom [pi coding agent](https://github.com/earendil-works/pi-coding-agent) extensions.

| Extension | What it does |
|---|---|
| [tps](tps/) | Real-time tok/s + TTFT in the footer during generation, run stats on finish |

## Install

```bash
git clone https://github.com/laterya/pi-extensions.git
cp pi-extensions/*/*.ts ~/.pi/agent/extensions/
```

Or pick just one: `cp pi-extensions/tps/tps.ts ~/.pi/agent/extensions/`. Reload pi — no config needed.

## Add a new extension

One directory per extension: `name/name.ts` + `name/README.md`.

## License

MIT
