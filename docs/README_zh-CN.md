[English](../README.md) | **简体中文**

---

# PDFMathTranslate (Fork)

保留排版的科学 PDF 文档翻译 —— 搭载现代 React 前端、FastAPI REST API、面向 AI Agent 的 MCP 服务器，以及 CLI 命令行。

本 Fork 专注于**独立 API + SPA 架构**，用 Vite 驱动的自定义 React 界面替代上游的 Gradio GUI，同时保留核心 PDF 翻译引擎。

## 快速开始

### 环境要求

Python 3.12+ 和 Node.js 18+。

### Windows 一键启动

双击 **`启动.bat`** — 自动检测环境、安装前端依赖、启动前后端服务、打开浏览器，并生成带自定义图标的 `PDFMathTranslate.lnk` 快捷方式。

### 手动启动

```bash
# 安装 Python 依赖
pip install -e .

# 终端 1：后端 API
python -m uvicorn pdf2zh.api:app --host 0.0.0.0 --port 8000 --reload

# 终端 2：前端开发服务器
cd frontend && npm install && npm run dev
```

浏览器打开 http://localhost:5173。

### 命令行翻译

```bash
# 首次配置（交互式服务配置向导）
pdf2zh --setup

# 翻译文档
pdf2zh document.pdf

# 指定服务与语言
pdf2zh document.pdf -s deepseek -li en -lo zh

# 批量翻译目录
pdf2zh --dir ./pdfs/ -s openai:gpt-4o-mini
```

`pdf2zh --setup` 会将 API Key 持久化保存至 `~/.config/PDFMathTranslate/config.json`（0600 权限），只需配置一次。

## 功能特性

### Web 界面 (React SPA)

- **现代化 UI**：React 19 + TypeScript 6 + Vite 8 + Tailwind 4
- **国际化**：完整的中文 / 英文切换
- **批量翻译**：多文件上传、进度追踪、ZIP 打包下载
- **服务配置**：从 25 个翻译服务中选用，在浏览器中直接输入 API Key 并测试连通性
- **SSE 进度推送**：通过 Server-Sent Events 实时展示翻译进度
- **输出模式**：纯译文（mono）、双语交替（dual）、左右对照（side）
- **历史记录**：客户端翻译历史
- **深色模式**：跟随系统主题自动切换

### REST API (FastAPI)

Base URL：`http://127.0.0.1:8000` — 交互式文档位于 `/docs`

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/setup-status` | 查看服务配置状态 |
| `GET` | `/api/services` | 列出全部 25 个翻译服务 |
| `GET` | `/api/languages` | 列出支持的语言 |
| `POST` | `/api/translate` | 发起单文件翻译 |
| `POST` | `/api/translate-batch` | 发起批量翻译（最多 20 个文件） |
| `GET` | `/api/translate/{job_id}` | 轮询任务状态 |
| `GET` | `/api/translate/{job_id}/progress` | SSE 实时进度流 |
| `GET` | `/api/download/{job_id}/{type}` | 下载译文（mono/dual/side） |
| `POST` | `/api/cancel/{job_id}` | 取消运行中的任务 |
| `POST` | `/api/test-service` | 测试翻译服务连通性 |
| `GET` | `/api/translate-batch/{batch_id}` | 批量任务状态 |
| `GET` | `/api/translate-batch/{batch_id}/download` | ZIP 下载全部译文 |

### MCP Server（面向 AI Agent）

本项目提供 MCP（Model Context Protocol）服务器，让 AI Agent（Claude Desktop、Hermes、Copilot 等）直接翻译 PDF：

```bash
# STDIO 模式（Claude Desktop）
python -m pdf2zh.mcp_server

# SSE 模式（HTTP 传输）
pdf2zh --mcp --sse --port 3001
```

MCP 工具：`get_setup_status`、`list_services`、`configure_service`、`test_service`、`translate_pdf`、`translate_batch`

**Agent 指南**：[`CLAUDE.md`](../CLAUDE.md)（完整参考）和 [`AGENTS.md`](../AGENTS.md)（Hermes 优化版）。两份指南均要求 AI Agent 在首次使用时必须先检查配置状态并引导用户选择服务 —— 绝不能静默使用默认服务。

## 与上游的差异

| 方面 | 上游 (Byaidu/PDFMathTranslate) | 本 Fork |
|------|-------------------------------|---------|
| **前端** | Gradio (`pdf2zh -i`) | React + Vite SPA |
| **API** | Gradio 端点 | FastAPI + SSE 进度推送 |
| **MCP** | 无 | MCP 服务器供 AI Agent 调用 |
| **配置** | 环境变量 | CLI 向导 (`--setup`) + UI 可视化配置 |
| **翻译引擎** | 共用 | 完全相同 |
| **翻译模式** | `fast` (v1) + `precise` (v2) | 相同，界面可选 |
| **输出模式** | mono / dual | mono / dual / side 左右对照 |
| **批量** | 仅 CLI 目录 | API 批量 + UI 多文件上传 |
| **历史记录** | 无 | 客户端任务历史 |
| **依赖加载** | 启动时加载全部 | 按需懒加载，缺失不影响启动 |

## 项目结构

```
启动.bat            一键启动（Windows，自举式快捷方式）
CLAUDE.md           完整 AI Agent 指南
AGENTS.md           Hermes 优化版 Agent 快速指南
assets/             静态资源（图标等）
frontend/           React 19 + Vite + TypeScript（SPA）
pdf2zh/             翻译引擎 + FastAPI 服务 + MCP 服务
  api.py            REST + SSE 端点
  mcp_server.py     MCP 工具（供 AI Agent 调用）
  pdf2zh.py         CLI 入口（--setup、--mcp、翻译）
  translator.py     25 个翻译服务（Google、OpenAI、DeepL 等）
  high_level.py     PDF → 翻译后 PDF 流水线
  config.py         持久化配置管理器（0600 权限）
  kernel/           可热插拔的内核抽象层（fast / precise）
  vendor/           内嵌依赖（babeldoc v0.6.3）
```

## 翻译模式

| 模式 | 引擎 | 特点 |
|------|------|------|
| **fast** | LegacyKernel → `translate_patch()` | 逐页串行，段落级并发 |
| **precise** | PreciseKernel → babeldoc | 子进程隔离，现代流水线 |

## 输出模式

三种输出模式共用同一翻译引擎，翻译质量完全一致：

| 模式 | 效果 |
|------|------|
| **mono**（纯译文） | 单栏翻译后 PDF |
| **dual**（双语交替） | 原文页与译文页交替 |
| **side**（左右对照） | 左原文右译文同页对照 |

## 翻译服务

| 类型 | 服务 |
|------|------|
| **免费**（无需 API Key） | Google、Bing、Argos |
| **付费 LLM**（质量最佳） | OpenAI、DeepSeek、Gemini、Grok、Groq、DeepL、Zhipu、ModelScope、SiliconCloud、MiniMax、302.AI、Qwen MT、OpenAI-Liked |
| **本地部署** | Ollama、Xinference、AnythingLLM、Dify |
| **企业级** | Azure OpenAI、Azure Translator、Tencent TMT |

详见 [CLAUDE.md](../CLAUDE.md) 获取完整的服务详情及环境变量要求。

## 开发

```bash
# 一键启动（Windows）
启动.bat

# 仅前端（热更新）
cd frontend && npm run dev

# 仅后端
python -m uvicorn pdf2zh.api:app --host 0.0.0.0 --port 8000 --reload

# MCP 服务器（STDIO 模式）
python -m pdf2zh.mcp_server

# MCP 服务器（SSE 模式）
pdf2zh --mcp --sse --port 3001

# 命令行翻译
pdf2zh document.pdf

# 测试
python -m pytest test/ -v
cd frontend && npm test -- --run
```

## 致谢

本项目 Fork 自 [Byaidu/PDFMathTranslate](https://github.com/Byaidu/PDFMathTranslate)，原项目已被 EMNLP 2025 接收。

```
@inproceedings{ouyang-etal-2025-pdfmathtranslate,
    title = "PDFMathTranslate: Scientific Document Translation Preserving Layouts",
    author = "Ouyang, Rongxin and Chu, Chang and Xin, Zhikuang and Ma, Xiangyao",
    booktitle = "Proceedings of EMNLP 2025: System Demonstrations",
    year = "2025",
    publisher = "Association for Computational Linguistics",
}
```

## 许可证

AGPL-3.0 — 与上游一致。
