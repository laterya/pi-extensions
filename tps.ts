// Real-time TPS: live streaming rate in the footer during generation,
// corrected to exact usage when the message finishes.
// - TTFT: before_provider_request -> first delta
// - tok/s: from FIRST delta onward (pure throughput, TTFT excluded)
// - live token count = number of delta events (≈1 token each; estimate until message_end)
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function isAssistantMessage(message: unknown): message is AssistantMessage {
	if (!message || typeof message !== "object") return false;
	const role = (message as { role?: unknown }).role;
	return role === "assistant";
}

const KEY = "tps";

export default function (pi: ExtensionAPI) {
	let requestMs: number | null = null;
	let firstDeltaMs: number | null = null;
	let deltas = 0;
	let lastPaintMs = 0;
	let agentStartMs: number | null = null;
	let runLlmMs = 0; // sum of (message_end - firstDelta): pure streaming time across the run

	pi.on("before_provider_request", () => {
		requestMs = Date.now();
		firstDeltaMs = null;
		deltas = 0;
		lastPaintMs = 0;
	});

	pi.on("message_update", (event, ctx) => {
		if (!ctx.hasUI) return;
		const e = event.assistantMessageEvent;
		if (e.type !== "text_delta" && e.type !== "thinking_delta" && e.type !== "toolcall_delta") return;

		if (firstDeltaMs === null) {
			firstDeltaMs = Date.now();
			lastPaintMs = firstDeltaMs; // don't paint the first frame: elapsed=0 would show a bogus spike
			return;
		}
		deltas++;

		const now = Date.now();
		if (now - lastPaintMs < 250) return; // throttle repaint
		lastPaintMs = now;

		const ttft = ((firstDeltaMs - (requestMs ?? firstDeltaMs)) / 1000).toFixed(1);
		const rate = deltas / Math.max((now - firstDeltaMs) / 1000, 0.001);
		ctx.ui.setStatus(KEY, `TTFT ${ttft}s | ${rate.toFixed(1)} tok/s`);
	});

	pi.on("message_end", (event, ctx) => {
		if (event.message.role !== "assistant" || firstDeltaMs === null) return;
		runLlmMs += Date.now() - firstDeltaMs;
		if (!ctx.hasUI) return;

		const out = event.message.usage.output || 0;
		const ttft = ((firstDeltaMs - (requestMs ?? firstDeltaMs)) / 1000).toFixed(1);
		const rate = out / Math.max((Date.now() - firstDeltaMs) / 1000, 0.001);
		ctx.ui.setStatus(KEY, `TTFT ${ttft}s | ${rate.toFixed(1)} tok/s | ${out.toLocaleString()} tok`);
	});

	pi.on("agent_start", () => {
		agentStartMs = Date.now();
		runLlmMs = 0;
	});

	pi.on("agent_end", (event, ctx) => {
		if (!ctx.hasUI || agentStartMs === null) return;
		const startMs = agentStartMs;
		agentStartMs = null;

		let input = 0;
		let output = 0;
		let cacheRead = 0;
		let cacheWrite = 0;
		let calls = 0;
		for (const message of event.messages) {
			if (!isAssistantMessage(message)) continue;
			calls++;
			input += message.usage.input || 0;
			output += message.usage.output || 0;
			cacheRead += message.usage.cacheRead || 0;
			cacheWrite += message.usage.cacheWrite || 0;
		}
		if (output <= 0) return;

		const wallS = (Date.now() - startMs) / 1000;
		const llmS = runLlmMs / 1000;
		const pure = (output / Math.max(llmS, 0.001)).toFixed(1);
		ctx.ui.notify(
			`Run: ${calls} LLM calls | out ${output.toLocaleString()} tok @ ${pure} tok/s (LLM ${llmS.toFixed(1)}s) | wall ${wallS.toFixed(1)}s, other ${(wallS - llmS).toFixed(1)}s | in ${input.toLocaleString()}, cache r/w ${cacheRead.toLocaleString()}/${cacheWrite.toLocaleString()}`,
			"info",
		);
	});
}
