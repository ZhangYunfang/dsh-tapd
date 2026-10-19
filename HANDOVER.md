# 交接包：dsh-tapd-oauth × DSH 0.1.2-alpha.2

> 30 秒上手（接手方只读这一节也能开工）
>
> 1. `cd /Users/zyf/Project/DSH_WorkSpace/dsh-tapd-oauth && npm run check` — 期望 typecheck 通过、6 个单测 + 4 个兼容测试全绿。
> 2. 看工作区根的 `.dsh/CONTINUE.md`（断点：此刻状态与入口命令，不重复本文档内容）。
> 3. 要装到本机 DSH：跳到第 7 节「安装与回滚」。

## 1. 这个工作区是什么

| 路径 | 作用 |
|---|---|
| `dsh-tapd-oauth/` | 唯一在建项目：DSH 的 TAPD MCP 设置插件（git 仓库，本文档所在处） |
| `deepseek-harness-dsh-v0.1.2-alpha.2.tar.gz` | DSH 运行环境的源码包（只读参考） |
| `.dsh/handover-draft/` | 本交接包的机器采集草稿（一次性产物） |
| `graphflow-out/` | GraphFlow 工具产物 |

- **运行环境（🔴 只读，禁止改动）**：`/Users/zyf/Project/deepseek-harness-dsh-v0.1.2-alpha.2`，版本 `0.1.2-alpha.2`，以 `pnpm dsh web --host 0.0.0.0` 启动，GUI 地址 `http://127.0.0.1:3080`。
- 本机工具链实测：Node `v24.21.0`、pnpm `12.3.4`、Python `3.9.6`。
- 用户硬约束：**不得修改运行环境目录里的任何内容**；适配只允许改插件项目本身。

## 2. 本阶段目标与结果（2026-10-19）

- **目标**：把原面向 DSH `0.2.x`（`0.2.0-rc.2` / `0.2.1-rc.2`）的插件改造成 `0.1.2-alpha.2` 可用。
- **结果**：已完成适配，版本 `0.0.5-local.1`；`npm run check` 全绿；产出安装包；分支 `adapt/dsh-0.1.2-alpha.2`，适配提交 `904042b`（本交接文档随后追加，最新 HEAD 用 `git log -1` 核对；工作树干净）。
- **未安装到本机 live profile**（用户环境未动，见第 5 节）。

## 3. 改了什么（逐项：文件 → 改法 → 为什么）

| 文件 | 改法 | 为什么 |
|---|---|---|
| `src/config.ts` | 三个用户字段去掉 `.volatile()`；`Config` 显式标注 `z<Config>`；`TapdSettingsSchema` 保留作设置命名空间 schema | 0.1.2 没有 volatile/live Config 引用，配置就是普通值，写作设置命名空间的 base 层 |
| `src/runtime.ts` | 用 `ctx.settings.register("tapd-mcp", TapdSettingsSchema, {base, applies:"live", validate})` + `scope.watch` 取代 `ctx.settings.configure` 与 `settings/document-updated`；写入改走 `scope.update`；无 settings 服务时落 `settingsOverride` 内存值；删除 `ctx.get("entry")` | 0.1.2 无 entry 服务、无 configure、无 volatile 引用；设置以命名空间 + 显式订阅为契约 |
| `src/index.ts` | `inject` 由 `["settings","credentials","tools"]` 改为 `["credentials","tools"]` | settings 在 0.1.2 是可选取舍的接缝，不应因为它缺失导致插件整体不加载 |
| `src/typert.ts`、`src/client/typert-remote.ts` | strict codec 由 `create: () => schema` 改为 `schema` | 0.1.2 的 codec 契约是「直接挂带 parse 的 schema」 |
| `package.json` | 版本 `0.0.4-local.1` → `0.0.5-local.1`；`@deepseek-ai/dsh-*` 全部钉 `0.1.2-alpha.2`；cordis `4.0.2`、schemastery `3.18.2`；`dsh-credentials`/`dsh-mcp-client`/`dsh-typert-protocol` 由 peer 改为 dependencies | 版本必须与运行版一致；这三个包在运行时真 import，留成 peer 会被 profile 里 hoist 的旧副本（见第 8 节）抢走 |
| `test/dsh-compat.node.mjs` | 整体重写：真 cordis + 真 `SettingsProvider` 子类 + 凭据/工具接缝 | 旧套件依赖 0.2 的 `SettingsForms`、`configEditor`、`updateVolatile`，在 0.1.2 不存在 |
| `test/mcp-config.test.ts` | 补三个新字段满足 `Config` 形状 | 类型检查 |
| `README.md`、`README.en.md` | 头部版本、安装命令、存储位置说明 | 与实际行为一致 |

**没有改动的部分**（业务逻辑一行未动）：`src/mcp-config.ts`（`uvx mcp-server-tapd` 的 env 映射）、`src/schemas.ts`、`src/save.ts`、`src/constants.ts`、客户端组件与样式、`cordis.patch.yml`、构建脚本、`tsconfig*`、`tsdown.config.ts`。

## 4. 实测状态（数字均为本机实跑，可复现）

| 检查 | 命令 | 结果 |
|---|---|---|
| 类型 + 单测 + 兼容套件 | `npm run check` | typecheck 通过；vitest **6/6**；node --test **4/4**（命名空间注册、保存落盘、非法 URL 拒绝、无 settings 回退、codec 契约、manifest 钉版本） |
| 交叉构建冒烟 | 见第 6 节脚本 | `CROSS_BUILD_OK`：插件（npm 安装的 0.1.2-alpha.2 依赖编译）跑在**安装版 core**（运行目录 lib）上，服务注册、设置写入、凭据事件均正常 |
| 端到端 MCP | 同上 | `MCP_BRIDGE_OK`：真 `dsh-mcp-client` 拉起假 stdio MCP server，`mcpPhase=active`，工具 `mcp__tapd__echo`、`mcp__tapd__version` 注册成功 |
| 前端 bundle | 同上 | `CLIENT_BUNDLE_OK`：`__ModuleLoader__` 契约、`settings.section` 注册、typert remote 挂载均通过 |
| 独立 DSH_HOME 试装 | 见第 7 节 | bundle patch 生效（`--dump-config` 出现 `tapd-mcp` 行）；`dsh web` 启动无报错；`/plugins/??dsh-tapd-mcp/client.js` 返回 200、178371 字节 |

**产物**：`dsh-tapd-mcp-0.0.5-local.1.tgz`（59462 字节），sha256 `22cbd206a40cd3fc73737e6787cfbf30d335ce3f037a201b0ba27cb124e0a4be`。注意 `.gitignore` 忽略 `*.tgz`，换机器需重新 `npm pack`。

## 5. 未做 / 未验证 / 待裁决（诚实边界）

- **未做**：没有把插件装进本机 web profile（`~/.dsh/profiles/web` 未出现 `dsh-tapd-mcp`），因此**没有在真实浏览器里点开过设置页**。
- **未验证**：没有用真实 `uvx mcp-server-tapd` + 真实 TAPD 凭据跑过；端到端测试用的是自写的假 stdio MCP server。首次 `uvx` 冷启动下载可能超过 MCP SDK 的初始化窗口，本版沿用 `failOnStartupError: false` 让客户端保留重连，但该路径未真机验证。
- **未验证**：本版本只对 `0.1.2-alpha.2` 负责；回到 0.2.x 需回退本分支（peer/dev 依赖已钉死 0.1.2）。
- **未做**：分支未推送远端（只在本地）。
- **待裁决**：交接文档是否随插件仓库一起发布到 GitHub（当前提交在本分支）。
- **运行目录清洁度说明**：源码零改动；运行目录里新增了两个**未跟踪**目录 `.graphflow-cache/` 与 `graphflow-out/`，系 GraphFlow 工具自动索引生成，不属于源码改动，可按需删除。

## 6. 验证脚本怎么重建（换机器/换会话）

三个冒烟脚本是临时文件（`/tmp/dsh-cross/`），不进仓库；要复现按下述方式重建：

1. `check.mjs`：从运行目录 `vendor/cordis/lib/index.js` import `Context`、从 `packages/settings/settings/lib/index.js` import `SettingsProvider`，再 import 本仓库 `lib/index.js`；用内存 provider + 凭据/工具桩，断言 `status()` 默认值、`save()` 落盘、`credentials/reference-updated` 触发 reconcile。
2. `check-mcp.mjs`：同上，但凭据桩返回真值、配置 `mcpCommand` 为 `process.execPath`、`mcpArgs` 指向 `fake-mcp.mjs`（30 行左右的换行分隔 JSON-RPC server，实现 initialize / tools/list / tools/call），断言 `mcpPhase=active` 且工具名为 `mcp__tapd__echo`、`mcp__tapd__version`。
3. `check-client.mjs`：设 `globalThis.window.__ModuleLoader__` 捕获注册，import `lib/client.js`，用桩 Context（`effect`/`locale`/`slots`/`remote.$mount`/`get`）跑 `apply()`，断言 `settings.section` 的 `id/order/locale/label` 与 codec 的 `schema.parse`。

## 7. 安装与回滚（本机）

```bash
cd /Users/zyf/Project/deepseek-harness-dsh-v0.1.2-alpha.2   # 与启动 DSH 相同的安装
npm_config_registry=https://registry.npmmirror.com \
  pnpm dsh plugin --profile web add \
  /Users/zyf/Project/DSH_WorkSpace/dsh-tapd-oauth/dsh-tapd-mcp-0.0.5-local.1.tgz
```

装完重启 `dsh web` 进程并刷新 `http://127.0.0.1:3080`，设置页会出现 TAPD 一页。

回滚：`pnpm dsh plugin --profile web remove dsh-tapd-mcp`，再重启 `dsh web`。

独立 DSH_HOME 预演（不碰用户环境，已验证可用）：

```bash
export DSH_HOME=/tmp/dsh-home-tapd
pnpm dsh plugin --profile web add /path/to/dsh-tapd-mcp-0.0.5-local.1.tgz
pnpm dsh --profile web --dump-config | tail -20   # 期望出现 id: tapd-mcp
```

## 8. 跨机器 / 换人迁移清单

**A. 必须手动搬（不入库或一次性）**：安装包 `*.tgz`（已被 gitignore，重新 `npm pack`）；凭据（TAPD 访问令牌只存 DSH 凭据存储，本文档不写值，只写变量名 `TAPD_ACCESS_TOKEN`）；`/tmp/dsh-cross` 冒烟脚本与 `/tmp/dsh-home-tapd` 预演环境；工作区根的断点文件。

**B. 新机器重建顺序**：① 装 Node ≥22.19 与 pnpm → ② 仓库根 `npm_config_registry=https://registry.npmmirror.com pnpm install`（0.1.2-alpha.2 依赖）→ ③ `npm run check`（期望 6 + 4 全绿）→ ④ `npm pack` → ⑤ 按第 7 节装到目标 DSH → ⑥ 设置页填 TAPD 地址与令牌 → ⑦ 观察 `mcpPhase` 与工具是否出现。

**C. 网络**：npm 官方源在本机偏慢，实测 `registry.npmmirror.com` 可用（HTTP 200、3 秒内返回）；判断连通性请用实测请求，不要只看工具返回码。

**🔴 依赖解析坑（最容易在新机器复现）**：profile 的 `node_modules` 里已 hoist 了 `@deepseek-ai/dsh-typert-protocol@0.1.0-rc.7`、`@deepseek-ai/dsh-credentials@0.1.5-rc.2` 等旧副本，而 profile 配置 `autoInstallPeers: false`。若把运行时真 import 的三个包继续放 peer，插件会解析到旧副本。本版把它们放进 `dependencies` 并钉死 `0.1.2-alpha.2`，解析优先取插件自己的副本；`cordis` 与 `schemastery` 已与运行版同版本（4.0.2 / 3.18.2），跨副本靠 `Symbol.for` 互操作。

## 9. 关键结论速查（下一阶段最容易踩的）

- 0.1.2 的插件设置写法：`ctx.settings.register`（或 `installSection`）+ `scope.watch`，落盘到 `$DSH_HOME/settings.yaml` 的对应段落；**没有** volatile Config、`configure({auto:false})`、`entry` 服务。
- 0.1.2 的 typert strict codec：`{ mode: "strict", typeSymbol, schema }`；**没有** `create` 工厂。
- 客户端插件契约与 0.2 相同：`dsh.client.inject/platform` + `window.__ModuleLoader__.load` 包装（`scripts/wrap-client.mjs`）、`settings.section` 槽位。

## 溯源

| 项 | 值 |
|---|---|
| 会话 | `session-ccfac4b4-5b22-468f-9358-59819f9f3dd9` |
| 日期 | 2026-10-19 |
| 写了哪几节 | §1–§9 全部（本阶段交接，追加式首版） |
| 事实来源 | 本机实跑（`npm run check`、交叉构建冒烟、端到端 MCP、独立 DSH_HOME 试装）与机器采集草稿 |
| 未做 | 未修改运行环境源码；未安装到用户 live profile |
