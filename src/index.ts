import type { Context } from "@deepseek-ai/cordis";
import { Config, type RuntimeConfig as PluginConfig } from "./config.js";
import { TapdMcpRuntime } from "./runtime.js";

export { Config };
export const name = "tapd-mcp";
// `settings` is optional in DSH 0.1.2: the runtime registers its namespace when
// the provider is mounted and falls back to the entry config + in-memory state.
export const inject = ["credentials", "tools"];

export async function apply(ctx: Context, config: PluginConfig): Promise<void> {
	const runtime = new TapdMcpRuntime(ctx, config);
	await runtime.start();
}
