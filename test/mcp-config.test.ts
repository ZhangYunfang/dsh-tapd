import { describe, expect, it } from "vitest";
import type { Config, TapdSettings } from "../src/config.js";
import { createMcpClientConfig } from "../src/mcp-config.js";

describe("TAPD MCP stdio mapping", () => {
	it("maps the token and endpoints to the exact mcp-server-tapd environment keys", () => {
		const config = {
			tapdTokenRef: "TAPD_ACCESS_TOKEN",
			mcpCommand: "uvx",
			mcpArgs: ["mcp-server-tapd"],
			toolCallTimeoutMs: 60_000,
			uvDefaultIndex: "https://pypi.tuna.tsinghua.edu.cn/simple",
			tapdBaseUrl: "https://www.tapd.cn",
			tapdApiBaseUrl: "https://api.tapd.cn",
			mcpEnabled: true,
		} satisfies Config;
		const settings: TapdSettings = {
			tapdBaseUrl: "https://www.tapd.cn",
			tapdApiBaseUrl: "https://api.tapd.cn",
			mcpEnabled: true,
		};

		expect(createMcpClientConfig(config, settings, "test-token")).toEqual({
			serverName: "tapd",
			transport: "stdio",
			command: "uvx",
			args: ["mcp-server-tapd"],
			env: {
				TAPD_ACCESS_TOKEN: "test-token",
				TAPD_API_BASE_URL: "https://api.tapd.cn",
				TAPD_BASE_URL: "https://www.tapd.cn",
				UV_DEFAULT_INDEX: "https://pypi.tuna.tsinghua.edu.cn/simple",
			},
			cwd: "",
			toolCallTimeoutMs: 60_000,
			failOnStartupError: false,
		});
	});
});
