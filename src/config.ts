import z from "@deepseek-ai/schemastery";
import { DEFAULT_TAPD_API_BASE_URL, DEFAULT_TAPD_BASE_URL } from "./constants.js";

export { DEFAULT_TAPD_API_BASE_URL, DEFAULT_TAPD_BASE_URL } from "./constants.js";

export interface Config {
	tapdTokenRef: string;
	mcpCommand: string;
	mcpArgs: string[];
	uvDefaultIndex: string;
	toolCallTimeoutMs: number;
	tapdBaseUrl: string;
	tapdApiBaseUrl: string;
	mcpEnabled: boolean;
}

/**
 * Composition config for the `tapd-mcp` entry. DSH 0.1.2 has no volatile/live
 * Config refs: the three user-facing fields are the composition `base` layer of
 * the `tapd-mcp` settings namespace, so a settings write overrides them without
 * rewriting `cordis.patch.yml`.
 */
export const Config: z<Config> = z.object({
	tapdTokenRef: z.string().default("TAPD_ACCESS_TOKEN"),
	mcpCommand: z.string().default("uvx"),
	mcpArgs: z.array(z.string()).default(["mcp-server-tapd"]),
	uvDefaultIndex: z.string().default("https://pypi.tuna.tsinghua.edu.cn/simple"),
	toolCallTimeoutMs: z.number().min(1).default(60_000),
	tapdBaseUrl: z.string().default(DEFAULT_TAPD_BASE_URL),
	tapdApiBaseUrl: z.string().default(DEFAULT_TAPD_API_BASE_URL),
	mcpEnabled: z.boolean().default(true),
});

export type RuntimeConfig = ReturnType<typeof Config>;

export interface TapdSettings {
	tapdBaseUrl: string;
	tapdApiBaseUrl: string;
	mcpEnabled: boolean;
}

/** The user-editable subset registered as the `tapd-mcp` settings namespace. */
export const TapdSettingsSchema: z<TapdSettings> = z.object({
	tapdBaseUrl: z.string().default(DEFAULT_TAPD_BASE_URL),
	tapdApiBaseUrl: z.string().default(DEFAULT_TAPD_API_BASE_URL),
	mcpEnabled: z.boolean().default(true),
});

function isLoopback(hostname: string): boolean {
	return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

export function parseServiceUrl(raw: string, label: string): URL {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new TypeError(`${label} 不是有效 URL`);
	}
	if (url.username !== "" || url.password !== "") throw new TypeError(`${label} 不能包含用户名或密码`);
	if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url.hostname))) {
		throw new TypeError(`${label} 必须使用 HTTPS（本机回环地址可使用 HTTP）`);
	}
	return url;
}

export function normalizeBaseUrl(raw: string, label: string): string {
	const url = parseServiceUrl(raw.trim(), label);
	url.hash = "";
	url.search = "";
	url.pathname = url.pathname.replace(/\/+$/, "") || "/";
	return url.toString().replace(/\/$/, "");
}

export function validateSettings(value: TapdSettings): void {
	parseServiceUrl(value.tapdBaseUrl, "TAPD 地址");
	parseServiceUrl(value.tapdApiBaseUrl, "TAPD API 地址");
}
