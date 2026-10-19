/**
 * DSH 0.1.2-alpha.2 compatibility suite.
 *
 * Boots the real cordis runtime, the real settings provider base class, and a
 * credentials seam, then drives the plugin exactly as the Host does: settings
 * go through the `tapd-mcp` settings namespace (composition `base` under the
 * user layer) and credential events trigger MCP reconciliation.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Context } from '@deepseek-ai/cordis';
import { SettingsProvider } from '@deepseek-ai/dsh-settings';
import * as Tapd from '../lib/index.js';
import { TYPERT } from '../lib/typert.js';

/** In-memory settings provider: the smallest real subclass of the service definition. */
class MemorySettings extends SettingsProvider {
	constructor(ctx, doc = {}) {
		super(ctx);
		this.doc = structuredClone(doc);
	}
	get writable() {
		return true;
	}
	load() {
		return Promise.resolve(structuredClone(this.doc));
	}
	persist(ns, section) {
		this.doc[ns] = structuredClone(section);
		return Promise.resolve();
	}
}

const BASE = {
	tapdBaseUrl: 'https://www.tapd.cn',
	tapdApiBaseUrl: 'https://api.tapd.cn',
	mcpEnabled: false,
};

/** Credentials seam the plugin resolves its token ref through. */
function credentialsStub(state) {
	return {
		async resolve() { state.resolutions++; return undefined; },
		async describe() { return { configured: false, writable: true }; },
		async set() { state.writes.push('set'); },
		async unset() { state.writes.push('unset'); },
	};
}

async function boot({ withSettings, doc = {} } = {}) {
	const ctx = new Context();
	const state = { resolutions: 0, writes: [] };
	const seams = ctx.plugin((child) => {
		child.provide('credentials', credentialsStub(state));
		child.provide('tools', {});
	});
	await seams;
	let settingsFiber;
	if (withSettings) {
		settingsFiber = ctx.plugin(MemorySettings, doc);
		await settingsFiber;
	}
	const plugin = ctx.plugin(Tapd, { ...BASE });
	await plugin;
	const tick = () => new Promise((resolve) => setImmediate(resolve));
	return { ctx, state, plugin, settingsFiber, seams, tick };
}

test('DSH 0.1.2 settings namespace persists writes and reconciles live', async () => {
	const { ctx, state, plugin, settingsFiber, seams, tick } = await boot({ withSettings: true });
	try {
		const runtime = ctx.get('tapdMcp');
		const settings = ctx.get('settings');
		assert.ok(runtime, 'the typert remote service is registered');
		assert.deepEqual(await runtime.status(), {
			...BASE,
			tapdTokenConfigured: false,
			tapdTokenWritable: true,
			mcpPhase: 'stopped',
			mcpError: '',
		});

		const described = settings.describe().find((entry) => entry.ns === 'tapd-mcp');
		assert.ok(described, 'the tapd-mcp namespace is registered');
		assert.equal(described.applies, 'live');
		assert.deepEqual(described.base, BASE);

		const before = state.resolutions;
		ctx.emit('credentials/reference-updated', 'TAPD_ACCESS_TOKEN');
		await tick();
		assert.equal(state.resolutions, before + 1, 'the TAPD ref triggers reconciliation');
		ctx.emit('credentials/reference-updated', 'UNRELATED_TOKEN');
		await tick();
		assert.equal(state.resolutions, before + 1, 'other refs do not');

		const uid = plugin.uid;
		await runtime.save({ ...BASE, tapdBaseUrl: 'https://example.tapd.cn', tapdToken: '', clearTapdToken: false });
		assert.equal(settings.doc['tapd-mcp'].tapdBaseUrl, 'https://example.tapd.cn');
		assert.equal((await runtime.status()).tapdBaseUrl, 'https://example.tapd.cn');
		assert.equal(plugin.uid, uid, 'live changes do not recreate the service');

		await assert.rejects(
			runtime.save({ ...BASE, tapdApiBaseUrl: 'http://insecure.example', tapdToken: '', clearTapdToken: false }),
			/HTTPS/,
		);
		assert.equal(settings.doc['tapd-mcp'].tapdBaseUrl, 'https://example.tapd.cn', 'a rejected save writes nothing');
	} finally {
		await plugin.dispose();
		if (settingsFiber !== undefined) await settingsFiber.dispose();
		await seams.dispose();
	}
});

test('the plugin still runs when no settings provider is mounted', async () => {
	const { ctx, plugin, seams } = await boot({ withSettings: false });
	try {
		const runtime = ctx.get('tapdMcp');
		assert.deepEqual(await runtime.status(), {
			...BASE,
			tapdTokenConfigured: false,
			tapdTokenWritable: true,
			mcpPhase: 'stopped',
			mcpError: '',
		});
		await runtime.save({ ...BASE, tapdBaseUrl: 'https://example.tapd.cn', tapdToken: 'token-value', clearTapdToken: false });
		const status = await runtime.status();
		assert.equal(status.tapdBaseUrl, 'https://example.tapd.cn', 'the in-memory fallback carries the write');
	} finally {
		await plugin.dispose();
		await seams.dispose();
	}
});

test('host RPC codecs expose the DSH 0.1.2 strict schema contract', () => {
	for (const invocation of TYPERT.invocations) {
		assert.equal(typeof invocation.result.schema.parse, 'function');
		for (const parameter of invocation.parameters) {
			assert.equal(typeof parameter.codec.schema.parse, 'function');
		}
	}
});

test('the manifest targets the DSH 0.1.2-alpha.2 runtime', async () => {
	const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
	assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
	assert.equal(manifest.dsh.client.platform, 'web');
	for (const [name, range] of Object.entries({ ...manifest.peerDependencies, ...manifest.dependencies })) {
		if (!name.startsWith('@deepseek-ai/dsh-')) continue;
		assert.equal(range, '0.1.2-alpha.2', `${name} targets the running runtime`);
	}
});
