// Append one JSONL line per agent run to <agentDir>/stats.jsonl (override with PI_STATS_FILE).
// Fields: ts, cwd, model/provider, LLM call count (+ errors), input/output/cache tokens,
// USD cost (as computed by pi-ai from usage), pure LLM streaming time, wall time.
// No UI needed — works in headless/print mode too.
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function isAssistantMessage(message: AgentMessage): message is AssistantMessage {
	return message.role === "assistant";
}

function statsFile(): string {
	return process.env.PI_STATS_FILE ?? join(getAgentDir(), "stats.jsonl");
}

export default function (pi: ExtensionAPI) {
	let agentStartMs: number | null = null;
	// sum of (message_end - message.timestamp): per-call streaming time, TTFT included
	let runLlmMs = 0;

	pi.on("agent_start", () => {
		agentStartMs = Date.now();
		runLlmMs = 0;
	});

	pi.on("message_end", (event) => {
		if (!isAssistantMessage(event.message)) return;
		runLlmMs += Date.now() - event.message.timestamp;
	});

	pi.on("agent_end", (event, ctx) => {
		const startMs = agentStartMs;
		agentStartMs = null;

		let calls = 0;
		let errors = 0;
		let input = 0;
		let output = 0;
		let cacheRead = 0;
		let cacheWrite = 0;
		let cost = 0;
		let model: string | undefined;
		let provider: string | undefined;
		for (const message of event.messages) {
			if (!isAssistantMessage(message)) continue;
			calls++;
			if (message.stopReason === "error") errors++;
			input += message.usage.input;
			output += message.usage.output;
			cacheRead += message.usage.cacheRead;
			cacheWrite += message.usage.cacheWrite;
			cost += message.usage.cost.total;
			model = message.model;
			provider = message.provider;
		}
		if (calls === 0) return;

		const record = {
			ts: new Date().toISOString(),
			cwd: ctx.cwd,
			model,
			provider,
			calls,
			errors: errors > 0 ? errors : undefined,
			input,
			output,
			cacheRead,
			cacheWrite,
			cost: Math.round(cost * 10000) / 10000,
			llmMs: runLlmMs,
			wallMs: startMs !== null ? Date.now() - startMs : undefined,
		};

		const file = statsFile();
		// fire-and-forget: stats must never block or break the agent loop
		mkdir(dirname(file), { recursive: true })
			.catch(() => {})
			.then(() => appendFile(file, JSON.stringify(record) + "\n"))
			.catch(() => {});
	});
}
