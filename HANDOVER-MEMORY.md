# 记忆清单：dsh-tapd-oauth × DSH 0.1.2-alpha.2

> 用途：换机器 / 换会话时，把这些**短事实**重新灌进新环境的记忆库，避免接手方从零摸索。
> 原则：只放短事实；长解释留在 `HANDOVER.md` 与代码注释里（长内容进 key 记忆=每轮上下文税）。

## 1. 本机已写入的记忆（来源可追溯）

| 轨 | 何时 | 内容摘要 |
|---|---|---|
| project（工作目录轨） | 2026-10-19 | 插件项目位置与背景：`/Users/zyf/Project/DSH_WorkSpace/dsh-tapd-oauth`，曾适配 0.1.5 / 0.2.0 / 0.2.1，本次需适配 0.1.2-alpha.2 |
| project | 2026-10-19 | 改造完成：分支 `adapt/dsh-0.1.2-alpha.2`、提交 `904042b`、版本 `0.1.0`、产物 `dsh-tapd-mcp-0.1.0.tgz` |
| project | 2026-10-19 | 验证方式：交叉构建（插件跑在安装版 core）+ 假 stdio MCP server 端到端 + 独立 DSH_HOME 试装 |
| project | 2026-10-19 | 改动边界：只改 config/runtime/index/typert/两个测试/两个 README/package.json；业务逻辑与前端组件未动 |
| daily（当日日志） | 2026-10-19 | 上述两次进展记录（改造完成、逐文件说明） |
| preference（长期偏好） | 2026-10-19 | **禁止改动 DSH 运行环境目录** `/Users/zyf/Project/deepseek-harness-dsh-v0.1.2-alpha.2`，适配只改插件项目 |

## 2. 要灌进新机器的短事实（逐条，按需写入）

1. DSH 运行环境（只读，禁止改动）在 `/Users/zyf/Project/deepseek-harness-dsh-v0.1.2-alpha.2`，版本 `0.1.2-alpha.2`，`pnpm dsh web` 提供 GUI `http://127.0.0.1:3080`。
2. 插件项目在 `/Users/zyf/Project/DSH_WorkSpace/dsh-tapd-oauth`；工作区根另有同版本 DSH 源码包 `deepseek-harness-dsh-v0.1.2-alpha.2.tar.gz`（只读参考）。
3. 适配目标版本是 `0.1.2-alpha.2`；**0.2.x 的写法在 0.1.2 上不可用**（无 volatile Config、无 `settings.configure`、无 `entry` 服务）。
4. 0.1.2 插件设置的正确写法：`ctx.settings.register(ns, schema, { base, applies:"live", validate })` + `scope.watch`，写入走 `scope.update`，落盘 `$DSH_HOME/settings.yaml`。
5. 0.1.2 的 typert strict codec 是 `{ mode:"strict", typeSymbol, schema }`；0.2 的 `create: () => schema` 会失效。
6. 依赖必须钉 `0.1.2-alpha.2`，并把 `dsh-credentials` / `dsh-mcp-client` / `dsh-typert-protocol` 放 **dependencies** 而非 peer —— profile 的 `autoInstallPeers: false` 且已 hoist 旧副本（`typert-protocol@0.1.0-rc.7`、`credentials@0.1.5-rc.2`），留 peer 会被抢。
7. 冒烟验证的最省事做法：从运行目录 lib 直接 import core（`vendor/cordis/lib/index.js`、`packages/settings/settings/lib/index.js`），插件用自己的 `lib/index.js`；MCP 端到端用自写的换行分隔 JSON-RPC 假 server，别真拉 `uvx`。
8. 安装插件用与启动 DSH 相同的安装执行 `pnpm dsh plugin --profile web add <tgz>`（`npm_config_registry=https://registry.npmmirror.com`），装完重启 `dsh web` 并刷新浏览器。
9. 产物校验值：`dsh-tapd-mcp-0.1.0.tgz`，sha256 `d3b2ba8cbc06f973bfa6182d9150a4fa4370f80b1606d3d4f03b97dcdc502a2e`。

## 3. 灌入新机器的步骤

1. 新机器上开一个 DSH 会话，工作目录设为本工作区（保证 project 轨落到对应项目）。
2. 用 `memory` 工具逐条写入：第 2 节的事实 1–9 建议写 `target=project`（项目背景类）或 `target=users` 之外的偏好轨仅在用户确认后写。
3. 与机器绑定很强的两条（事实 1、8）也可以只留在 `HANDOVER.md`；写记忆时只保留“路径 + 约束”。
4. 写完打开一个**新会话**自检：问「这个工作区的插件适配到哪个版本、怎么装」，能答出 0.1.2-alpha.2 与 `pnpm dsh plugin --profile web add` 即灌入成功。

## 4. 未做 / 未验证

- **未做**：没有把第 2 节的条目导出为可机读文件（当前只有本表格，靠 `memory` 工具手工写入）。
- **未验证**：`target=key` 轨（每轮注入的项目关键记忆）在本机未新增条目；是否要把「0.1.2 适配要点」提升为 key 记忆，待用户裁决。
- **未验证**：记忆库中本项目条目的归属目录（`~/.dsh/memories/projects/<hash>`）未逐一核对；新机器若工作区路径不同，project 轨会落到新的目录。

## 溯源

| 项 | 值 |
|---|---|
| 会话 | `session-ccfac4b4-5b22-468f-9358-59819f9f3dd9` |
| 日期 | 2026-10-19 |
| 写了哪几节 | §1–§4（首版记忆清单） |
| 事实来源 | 本机 `~/.dsh/memory/` 与 `~/.dsh/memories/` 实读 + 本会话实际操作记录 |
