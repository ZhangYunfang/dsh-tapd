# 部署安装指南（DSH 0.1.2-alpha.2）

> 把 `dsh-tapd-mcp` 装进任意一份 DSH，并在设置页配好后拿到 47 个 `mcp__tapd__*` 工具。
> 适用于：源码安装的 DSH、npx 启动的 DSH、内网离线机器。
> 版本对应：插件 `0.1.0` ↔ DSH 核心包 `0.1.2-alpha.2`。

## 目录

1. [前提条件](#1-前提条件)
2. [安装](#2-安装)
3. [配置](#3-配置)
4. [验证](#4-验证)
5. [排错](#5-排错)
6. [升级 / 卸载 / 换 profile](#6-升级--卸载--换-profile)
7. [从源码构建与发布（维护者）](#7-从源码构建与发布维护者)
8. [相关文档](#8-相关文档)

---

## 1. 前提条件

| 项 | 要求 | 检查命令 | 不满足时 |
|---|---|---|---|
| DSH | 核心包 **0.1.2-alpha.2** | `node -e "console.log(require('<DSH目录>/package.json').version)"` | 其他版本需另行适配（本插件依赖已钉死 0.1.2-alpha.2） |
| Node.js | `^22.19.0 \|\| >=24.0.0` | `node -v` | 用 nvm/Homebrew 装 |
| pnpm | 能在 profile 目录里跑 | `pnpm -v` | `corepack enable` 或 `npm i -g pnpm` |
| uv / uvx | 拉起 `mcp-server-tapd` 必需 | `command -v uvx && uvx --version` | macOS：`brew install uv`；Linux/macOS 通用：`curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| TAPD 令牌 | TAPD 个人访问令牌 | — | TAPD「个人设置 → 开放平台 → 申请访问令牌」 |
| 网络 | 能访问 npm registry；首次要能下载 PyPI 包 | `curl -sI https://registry.npmmirror.com` | 见 [排错](#5-排错) |

> **uvx 为什么必需**：插件是通过 `uvx mcp-server-tapd` 拉起 MCP 子进程的；没有 uvx 时插件能加载、设置页也能打开，但工具一个都不会出现。

---

## 2. 安装

安装包地址（GitHub Release）：

```text
https://github.com/ZhangYunfang/dsh-tapd/releases/download/v0.1.0/dsh-tapd-mcp-0.1.0.tgz
```

### 方式 A：源码安装的 DSH（推荐）

```bash
cd /path/to/deepseek-harness-dsh-v0.1.2-alpha.2      # 与启动 DSH 的那份安装同目录
npm_config_registry=https://registry.npmmirror.com \
  pnpm dsh plugin --profile web add \
  https://github.com/ZhangYunfang/dsh-tapd/releases/download/v0.1.0/dsh-tapd-mcp-0.1.0.tgz
```

### 方式 B：npx 启动的 DSH（本机没有源码仓库）

```bash
npx --yes @deepseek-ai/dsh@0.1.2-alpha.2 plugin --profile web add \
  https://github.com/ZhangYunfang/dsh-tapd/releases/download/v0.1.0/dsh-tapd-mcp-0.1.0.tgz
```

> CLI 版本要与你正在跑的 DSH 版本一致；不确定时用 `0.1.2-alpha.2`。

### 方式 C：离线 / 内网

```bash
# 在有网的机器上下载
curl -LO https://github.com/ZhangYunfang/dsh-tapd/releases/download/v0.1.0/dsh-tapd-mcp-0.1.0.tgz
# 拷到目标机器后（在 DSH 安装目录执行）
pnpm dsh plugin --profile web add /本地路径/dsh-tapd-mcp-0.1.0.tgz
```

> 离线机器仍需能访问 npm registry（插件有 5 个 npm 依赖）与 PyPI（`mcp-server-tapd`）；完全断网时请先在联网机器上 `pnpm store` 预热或用内网镜像。

### 安装后做了什么（可核对）

```bash
grep -n "dsh-tapd-mcp" ~/.dsh/profiles/web/package.json     # dependencies + dsh.profile.bundles 各一条
ls ~/.dsh/profiles/web/node_modules/dsh-tapd-mcp            # 插件已落地
```

---

## 3. 配置

### 3.1 重启 DSH Web（必须）

```bash
# 停掉当前 dsh web（Ctrl+C 或对应进程管理命令），然后重新启动
cd /path/to/deepseek-harness-dsh-v0.1.2-alpha.2 && pnpm dsh web --host 0.0.0.0
```

> 安装/升级后**必须重启**：profile 的 bundle 列表在启动时读取，运行中不会热加载新插件。仅在设置页「保存」不足以拉起 MCP 子进程。

### 3.2 在设置页填写

1. 浏览器打开 DSH（默认 `http://localhost:3080`），进入 **设置 → TAPD**
2. 填写：

| 字段 | 值 |
|---|---|
| TAPD 地址 | `https://www.tapd.cn` |
| TAPD API 地址 | `https://api.tapd.cn` |
| TAPD 个人访问令牌 | 粘贴你的令牌（只写，不回显） |
| 启用 TAPD MCP | 勾选 |

3. 点 **保存设置**

### 3.3 配置存在哪

| 内容 | 位置 | 说明 |
|---|---|---|
| TAPD 地址 / 启用状态 | `$DSH_HOME/settings.yaml` 的 `tapd-mcp:` 段 | profile 的 `cordis.patch.yml` 中同名字段只作默认值 |
| 令牌 | DSH 凭据存储（`$DSH_HOME/.credentials.yaml`，键名 `TAPD_ACCESS_TOKEN`） | 浏览器与服务日志都不会回显 |
| MCP 启动命令 | profile `cordis.patch.yml` 的 `tapd-mcp` 行（`mcpCommand: uvx`、`uvArgs`、镜像源） | 一般不用改 |

> **令牌只写**：留空保存 = 保留原令牌；点「清除 Token」才会删除。
> **环境变量优先**：若启动 DSH 的 shell 里设了 `TAPD_ACCESS_TOKEN`，它的优先级最高且设置页变只读。

---

## 4. 验证

三步都过才算真正打通。

### ① 子进程起来了

```bash
ps -axo pid,ppid,command | grep -E "mcp-server-tapd|uvx" | grep -v grep
# 期望看到类似：uv tool uvx mcp-server-tapd → .../mcp-server-tapd/bin/python .../mcp-server-tapd
```

### ② 新会话里有工具

**必须开一个全新会话**（已有会话的工具表在建立时固定），然后说：

```text
列一下 tapd 工具
```

期望出现 47 个 `mcp__tapd__*`，例如 `mcp__tapd__get_user_participant_projects`、`mcp__tapd__get_bug`、`mcp__tapd__create_story_or_task`。

### ③ 真调一次

```text
我参与的 TAPD 项目有哪些
```

期望返回项目列表（`get_user_participant_projects`）。

> ⚠️ **不要只看设置页状态**：插件配了 `failOnStartupError: false`，MCP 启动失败时状态仍可能显示「运行中」。以 ②③ 为准。

---

## 5. 排错

| 现象 | 原因 | 解决 |
|---|---|---|
| 设置页显示「启动失败」，错误含 `uvx` / `ENOENT` | 没装 uv | `brew install uv`（或 curl 安装脚本），重启 `dsh web` |
| 设置页「运行中」但新会话没有工具 | MCP 子进程没起来 / 启动前就失败 | ①`ps` 看有没有子进程；②重启 `dsh web`；③看设置页红色错误文本 |
| 装完 uv 后仍无工具 | 运行中的实例是装 uv 之前启动的 | 重启 `dsh web`（保存设置不一定能救回） |
| 首次调用要等 1–2 分钟 | `uvx` 在下载 `mcp-server-tapd` | 等待，客户端会自动重连；可先手动 `uvx mcp-server-tapd --help` 预热 |
| `pnpm` 报 `ECONNRESET` / 安装卡住 | npm 源不稳 | 命令前加 `npm_config_registry=https://registry.npmmirror.com` |
| 设置页令牌输入框变只读 | 启动 shell 里有 `TAPD_ACCESS_TOKEN` | 移除该环境变量或改用它作为凭据来源，然后重启 |
| 提示版本不兼容 / 插件加载失败 | DSH 不是 0.1.2-alpha.2 | 换到对应版本，或按新版本重新适配 |
| 浏览器打不开 `http://127.0.0.1:3080` | 系统代理拦截了 `127.*` | 改用 `http://localhost:3080` |
| 想确认令牌本身是否有效 | — | 在 shell 里 `TAPD_ACCESS_TOKEN=你的令牌 uvx mcp-server-tapd --help`，能打印 usage 即包可运行；真实调用以设置页/工具为准 |

---

## 6. 升级 / 卸载 / 换 profile

### 升级到新版本

```bash
# 方式 A/B 任选，URL 换成新版本
pnpm dsh plugin --profile web add \
  https://github.com/ZhangYunfang/dsh-tapd/releases/download/v<新版本>/dsh-tapd-mcp-<新版本>.tgz
# 然后重启 dsh web
```

设置与令牌都保留（分别在 `settings.yaml` 与凭据存储，不随插件包覆盖）。

### 卸载

```bash
pnpm dsh plugin --profile web remove dsh-tapd-mcp
# 重启 dsh web；如需彻底清理，再删 settings.yaml 里 tapd-mcp 段与凭据 TAPD_ACCESS_TOKEN
```

### 装到别的 profile

把 `--profile web` 换成目标 profile（如 `tui`、`headless`）：

```bash
pnpm dsh plugin --profile <name> add <tgz 或 URL>
```

---

## 7. 从源码构建与发布（维护者）

```bash
git clone git@github.com:ZhangYunfang/dsh-tapd.git
cd dsh-tapd
npm_config_registry=https://registry.npmmirror.com pnpm install
npm run check          # typecheck + 6 个单测 + 4 个兼容测试
npm pack               # 产出 dsh-tapd-mcp-<版本>.tgz
```

发布新版本：

```bash
npm version <x.y.z> --no-git-tag-version
npm pack
git add -A && git commit -m "release: dsh-tapd-mcp <x.y.z>"
git push zhang HEAD:main            # zhang = git@github.com:ZhangYunfang/dsh-tapd.git
git tag -a v<x.y.z> -m "dsh-tapd-mcp <x.y.z>" && git push zhang v<x.y.z>
# 然后在 GitHub Releases 页面用该 tag 新建 release 并上传 tgz
```

---

## 8. 相关文档

| 文档 | 内容 |
|---|---|
| `README.md` / `README.en.md` | 插件简介、工作方式、上游安装方式 |
| `HANDOVER.md` | 本次适配到 0.1.2-alpha.2 的完整交接（改了什么、实测证据、迁移清单） |
| `HANDOVER-MEMORY.md` | 换机器时要灌入记忆库的短事实 |
| [Releases](https://github.com/ZhangYunfang/dsh-tapd/releases) | 各版本 tgz 与校验值 |
