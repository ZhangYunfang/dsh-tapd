import { createHash } from "node:crypto";
import type { Context, Fiber } from "@deepseek-ai/cordis";
import { credentialRef, type CredentialRef } from "@deepseek-ai/dsh-credentials";
import * as McpClient from "@deepseek-ai/dsh-mcp-client";
import type { SettingsScope } from "@deepseek-ai/dsh-settings";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { type RuntimeConfig, type TapdSettings, TapdSettingsSchema, validateSettings } from "./config.js";
import { createMcpClientConfig } from "./mcp-config.js";
import { saveTapdSettings } from "./save.js";
import type { SaveInput, TapdStatus } from "./schemas.js";

const SETTINGS_NAMESPACE = "tapd-mcp";
type McpPhase = TapdStatus["mcpPhase"];

function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message.slice(0, 500);
	return String(error).slice(0, 500);
}

function signature(parts: string[]): string {
	return createHash("sha256").update(parts.join("\0")).digest("hex");
}

declare module "@deepseek-ai/cordis" {
	interface Context {
		tapdMcp: TapdMcpRuntime;
	}
}

export class TapdMcpRuntime extends TypertRemoteService {
	private readonly tapdTokenRef: CredentialRef;
	private readonly config: RuntimeConfig;
	private readonly baseSettings: TapdSettings;
	/** Live `tapd-mcp` settings scope while the settings provider is mounted. */
	private settingsScope: SettingsScope<TapdSettings> | undefined;
	/** Last accepted settings write while no settings provider is mounted. */
	private settingsOverride: TapdSettings | undefined;
	private mcpFiber: Fiber | undefined;
	private mcpSignature = "";
	private mcpPhase: McpPhase = "stopped";
	private mcpError = "";
	private reconcileTail: Promise<void> = Promise.resolve();

	constructor(ctx: Context, config: RuntimeConfig) {
		super(ctx, "tapdMcp");
		this.config = config;
		this.tapdTokenRef = credentialRef(config.tapdTokenRef);
		this.baseSettings = {
			tapdBaseUrl: config.tapdBaseUrl,
			tapdApiBaseUrl: config.tapdApiBaseUrl,
			mcpEnabled: config.mcpEnabled,
		};
		validateSettings(this.currentSettings());
		ctx.on("credentials/reference-updated", (ref) => {
			if (ref === this.tapdTokenRef) this.scheduleReconcile();
		});
		// 0.1.2 keeps settings behind an optional service seam: register the
		// namespace (composition entry config as `base`) while the provider is
		// mounted and fall back to the in-memory override when it detaches.
		ctx.inject(["settings"], (settingsCtx) => {
			const scope = settingsCtx.settings.register(SETTINGS_NAMESPACE, TapdSettingsSchema, {
				base: this.baseSettings,
				applies: "live",
				validate: validateSettings,
			});
			this.settingsScope = scope;
			const unwatch = scope.watch(() => {
				this.scheduleReconcile();
			});
			settingsCtx.effect(() => () => {
				unwatch();
				this.settingsScope = undefined;
			}, "tapd-mcp: settings namespace");
			this.scheduleReconcile();
		});
		ctx.effect(async () => async () => {
			await this.disposeMcp();
		}, "tapd-mcp: MCP lifecycle");
	}

	private currentSettings(): TapdSettings {
		return this.settingsScope?.get() ?? this.settingsOverride ?? this.baseSettings;
	}

	async start(): Promise<void> {
		await this.enqueueReconcile();
	}

	private enqueueReconcile(): Promise<void> {
		this.reconcileTail = this.reconcileTail.then(
			() => this.reconcile(),
			() => this.reconcile(),
		);
		return this.reconcileTail;
	}

	private scheduleReconcile(): void {
		void this.enqueueReconcile().catch(() => {
			this.mcpPhase = "failed";
			this.mcpError = "tapd-mcp: background reconciliation failed";
			this.ctx.logger.warn("tapd-mcp: background reconciliation failed");
		});
	}

	private async disposeMcp(): Promise<void> {
		const fiber = this.mcpFiber;
		this.mcpFiber = undefined;
		this.mcpSignature = "";
		if (fiber !== undefined) await fiber.dispose();
		this.mcpPhase = "stopped";
	}

	private async reconcile(): Promise<void> {
		const settings = this.currentSettings();
		const token = await this.ctx.credentials.resolve(this.tapdTokenRef);
		if (!settings.mcpEnabled || token === undefined) {
			await this.disposeMcp();
			this.mcpError = "";
			return;
		}

		const nextSignature = signature([
			token.value,
			settings.tapdBaseUrl,
			settings.tapdApiBaseUrl,
			this.config.mcpCommand,
			...this.config.mcpArgs,
			this.config.uvDefaultIndex,
			String(this.config.toolCallTimeoutMs),
		]);
		if (this.mcpFiber !== undefined && this.mcpSignature === nextSignature) return;

		await this.disposeMcp();
		this.mcpPhase = "starting";
		this.mcpError = "";
		const fiber = this.ctx.plugin(McpClient, createMcpClientConfig(this.config, settings, token.value));
		try {
			await fiber;
			this.mcpFiber = fiber;
			this.mcpSignature = nextSignature;
			this.mcpPhase = "active";
		} catch (error) {
			await fiber.dispose().catch(() => undefined);
			this.mcpPhase = "failed";
			this.mcpError = errorMessage(error).replaceAll(token.value, "[REDACTED]");
			this.ctx.logger.warn("tapd-mcp: TAPD MCP startup failed: %s", this.mcpError);
		}
	}

	@Remote
	async status(): Promise<TapdStatus> {
		const current = this.currentSettings();
		const token = await this.ctx.credentials.describe(this.tapdTokenRef);
		return {
			...current,
			tapdTokenConfigured: token.configured,
			tapdTokenWritable: token.writable,
			mcpPhase: this.mcpPhase,
			mcpError: this.mcpError,
		};
	}

	@Remote
	async save(input: SaveInput): Promise<TapdStatus> {
		return saveTapdSettings(input, {
			setToken: (value) => this.ctx.credentials.set(this.tapdTokenRef, value),
			unsetToken: () => this.ctx.credentials.unset(this.tapdTokenRef),
			updateSettings: async (next) => {
				const scope = this.settingsScope;
				if (scope !== undefined) {
					await scope.update(next);
					return;
				}
				this.settingsOverride = next;
			},
			scheduleReconcile: () => this.scheduleReconcile(),
			status: () => this.status(),
		});
	}
}
