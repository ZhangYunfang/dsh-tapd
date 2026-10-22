> Local compatibility build `0.1.0` for DSH CLI / core packages `0.1.2-alpha.2`. This is not an upstream release. The older installation commands below refer to the upstream release; for this build use the accompanying local `.tgz`.

# dsh-tapd-mcp

[中文](./README.md) | [English](./README.en.md)

A TAPD MCP settings plugin for DeepSeek Harness Web. Configure the TAPD URLs and personal access token in DSH Settings; the plugin starts an equivalent MCP server configuration:

- Source repository: <https://github.com/ZhangYunfang/dsh-tapd>
- Releases: <https://github.com/ZhangYunfang/dsh-tapd/releases>

\`\`\`json
{
  "mcpServers": {
    "mcp-server-tapd": {
      "command": "uvx",
      "args": ["mcp-server-tapd"],
      "env": {
        "TAPD_ACCESS_TOKEN": "<injected by DSH credentials>",
        "TAPD_API_BASE_URL": "https://api.tapd.cn",
        "TAPD_BASE_URL": "https://www.tapd.cn",
        "UV_DEFAULT_INDEX": "https://pypi.tuna.tsinghua.edu.cn/simple"
      }
    }
  }
}
\`\`\`

This release does not implement WeCom QR-code login or OAuth. WeCom authentication and the token authentication used by \`mcp-server-tapd\` are separate concerns. If the DSH site itself requires WeCom SSO, configure it at the reverse proxy, gateway, or identity-provider layer.

## How it works

- The TAPD token is managed by \`ctx.credentials\`; it is never stored in ordinary settings or returned through browser RPC.
- TAPD URLs and the enabled state are stored in the \`tapd-mcp\` DSH settings namespace.
- When MCP is enabled and a token is configured, the plugin starts \`uvx mcp-server-tapd\`.
- The plugin resolves \`mcp-server-tapd\` through the Tsinghua PyPI mirror by default, avoiding TLS/connectivity failures to the official PyPI endpoint on some networks. The plugin configuration can override it or leave it empty to restore uv's official default.
- Changing a URL, the token, or the enabled state automatically restarts or stops the MCP child process.
- If the first \`uvx\` download exceeds the MCP SDK's fixed 60-second initialization window, the MCP client stays alive and reconnects automatically. No additional save is required after the download completes.
- Startup errors are shown in the TAPD settings panel, with the current token redacted.

## Requirements

- Node.js \`^22.19.0\` or \`>=24.0.0\`
- pnpm. The DSH \`plugin\` command invokes pnpm, including when DSH itself is launched with npx.
- \`uvx\` available in the shell that starts DSH
- A valid TAPD personal access token

Verify the commands first:

\`\`\`bash
node --version
pnpm --version
uvx --version
\`\`\`

## GitHub Release package

\`dsh plugin add\` accepts a Release tarball URL directly. You do not need to download or unpack it first:

<https://github.com/ZhangYunfang/dsh-tapd/releases/download/v0.1.0/dsh-tapd-mcp-0.1.0.tgz>

## Installation option 1: DeepSeek Harness source checkout

Use this when you run DSH from a DeepSeek Harness source checkout with \`pnpm dsh web\`. Run these commands from the DeepSeek Harness repository root:

\`\`\`bash
pnpm dsh plugin --profile web add https://github.com/ZhangYunfang/dsh-tapd/releases/download/v0.1.0/dsh-tapd-mcp-0.1.0.tgz
pnpm dsh web
\`\`\`

## Installation option 2: npx

Use this when you do not have a DeepSeek Harness source checkout:

\`\`\`bash
npx --yes @deepseek-ai/dsh@latest plugin --profile web add https://github.com/ZhangYunfang/dsh-tapd/releases/download/v0.1.0/dsh-tapd-mcp-0.1.0.tgz
npx --yes @deepseek-ai/dsh@latest web
\`\`\`

To keep every invocation on the same CLI version, replace \`latest\` with a fixed version. Version \`0.1.1-rc.2\` has been verified with this plugin.

## Upgrading from the old plugin

If \`dsh-tapd-wecom\` is installed, remove it using the same DSH launch method you normally use.

Source-checkout mode:

\`\`\`bash
pnpm dsh plugin --profile web remove dsh-tapd-wecom
\`\`\`

npx mode:

\`\`\`bash
npx --yes @deepseek-ai/dsh@latest plugin --profile web remove dsh-tapd-wecom
\`\`\`

Then install the current GitHub Release using the corresponding command above.

## Configure TAPD

After starting DSH with \`pnpm dsh web\` or \`npx --yes @deepseek-ai/dsh@latest web\`:

1. Open Settings.
2. Select TAPD MCP.
3. Set the TAPD URL to \`https://www.tapd.cn\`.
4. Set the TAPD API URL to \`https://api.tapd.cn\`.
5. Enter a newly generated TAPD personal access token.
6. Enable TAPD MCP and save.
7. When the status becomes Active, the \`mcp__tapd__*\` tools are ready.

The token input is write-only. The page shows only whether a token is configured. Saving an empty token field keeps the existing value; Clear token removes it when the settings are saved.

## Default plugin configuration

The package installs this \`cordis.patch.yml\` layer:

\`\`\`yaml
- insert:
    - id: tapd-mcp
      name: dsh-tapd-mcp
      config:
        tapdTokenRef: TAPD_ACCESS_TOKEN
        mcpCommand: uvx
        mcpArgs:
          - mcp-server-tapd
        uvDefaultIndex: https://pypi.tuna.tsinghua.edu.cn/simple
\`\`\`

Do not put a token in this file. \`tapdTokenRef\` is a credential reference name, not the token value.

## Repair a \`.credentials.yaml\` startup error

Current DSH releases use a versioned \`$DSH_HOME/.credentials.yaml\`. The numeric \`version: 1\` field must be at the document root:

\`\`\`yaml
version: 1

refs:
  TAPD_ACCESS_TOKEN: "replace-with-a-new-token"
\`\`\`

Normally you should repair the document structure and then save the token from DSH Settings instead of editing the file manually. If you edit it manually, keep owner-only permissions:

\`\`\`bash
chmod 600 ~/.dsh/.credentials.yaml
\`\`\`

## Troubleshooting

### Registry requests fail with \`ECONNRESET\`

A failed \`ping\` does not mean HTTPS is unavailable; registries may block ICMP. Test the mirror over HTTPS:

\`\`\`bash
curl -I --connect-timeout 5 --max-time 15 https://registry.npmmirror.com
\`\`\`

For one command, select the mirror like this:

\`\`\`bash
npm_config_registry=https://registry.npmmirror.com pnpm dsh plugin --profile web add https://github.com/ZhangYunfang/dsh-tapd/releases/download/v0.1.0/dsh-tapd-mcp-0.1.0.tgz
\`\`\`

### MCP fails to start

\`\`\`bash
command -v uvx
uvx --version
\`\`\`

Make sure the shell that starts DSH can access the Python package index and TAPD API. The first \`uvx mcp-server-tapd\` run may need to download the package.

By default the plugin passes \`UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple\` to \`uvx\`. If your organization provides an internal Python index, set \`uvDefaultIndex\` in the \`tapd-mcp\` plugin configuration. Set it to an empty string to restore uv's official PyPI default.

On a slow cold start, the settings page may briefly report an active bridge while tools are still synchronizing in the background. The MCP client reconnects automatically; wait one or two minutes instead of repeatedly saving.

### The token is read-only

If \`TAPD_ACCESS_TOKEN\` is set in the environment that starts DSH, that environment value has the highest precedence and cannot be overwritten from Settings. Change or remove the environment variable and restart DSH, or continue using it as the credential source.

## Build a Release package

\`\`\`bash
pnpm install
pnpm check
pnpm pack
shasum -a 256 dsh-tapd-mcp-0.0.1.tgz
\`\`\`

\`pnpm check\` runs type checking, tests, and a clean build. Upload the tarball produced by \`pnpm pack\` as a GitHub Release asset.

## Security

- Never paste a real token into chats, screenshots, repositories, shell history, or ordinary JSON/YAML configuration.
- Revoke and rotate any token that has been exposed.
- \`.credentials.yaml\` is readable by processes running as the same operating-system user. It prevents browser and ordinary settings surfaces from returning the secret, but it is not equivalent to an OS keychain.

## Local compatibility build for DSH 0.1.2-alpha.2

```bash
# in this plugin checkout
CI=true pnpm install
npm run check
pnpm pack

# run with the same installation that serves DSH (the DSH source checkout)
cd /path/to/deepseek-harness-dsh-v0.1.2-alpha.2
pnpm dsh plugin --profile web add /path/to/dsh-tapd-mcp-0.1.0.tgz
```

This build targets the DSH 0.1.2 settings contract: the `tapd-mcp` namespace is registered through `ctx.settings.register` (the same-named fields in the profile `cordis.patch.yml` are only the composition `base`), so TAPD URLs and the enabled state are written to the `tapd-mcp` section of `$DSH_HOME/settings.yaml`. Tokens remain in the credential store. Restart `dsh web` and reload the browser after installing.

If an older settings migration failed, the `tapd-mcp` section in `~/.dsh/settings.yaml.imported` keeps the previous URLs and enabled state. Merge only those three fields into the `tapd-mcp` section of `settings.yaml`; never overwrite the whole document or copy other credentials.
