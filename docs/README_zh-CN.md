[English](../README.md) | **简体中文**

---

# PDFMathTranslate (Fork)

保留排版的科学 PDF 文档翻译 —— 搭载现代 React 前端与 FastAPI 后端。

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

## 与上游的差异

| 方面 | 上游 (Byaidu/PDFMathTranslate) | 本 Fork |
|------|-------------------------------|---------|
| **前端** | Gradio (`pdf2zh -i`) | React + Vite SPA |
| **API** | Gradio 端点 | FastAPI + SSE 进度推送 |
| **翻译引擎** | 共用 | 完全相同 |
| **翻译模式** | `fast` (v1) + `precise` (v2) | 相同，界面可选 |
| **输出模式** | 纯译文 / 双语 | 纯译文 / 双语 / 左右对照 |
| **历史记录** | 无 | 客户端任务历史 |
| **依赖加载** | 启动时加载全部 | 按需懒加载，缺失不影响启动 |

## 项目结构

```
启动.bat            一键启动（Windows，自举式快捷方式）
assets/             静态资源（图标等）
frontend/           React 19 + Vite + TypeScript（SPA）
pdf2zh/             翻译引擎 + FastAPI 服务
  api.py            REST + SSE 端点
  translator.py     多服务翻译（Google、OpenAI、DeepL 等）
  high_level.py     PDF → 翻译后 PDF 流水线
  vendor/           内嵌依赖（babeldoc）
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
| **dual**（双语） | 原文页与译文页交替 |
| **side**（左右对照） | 左原文右译文同页对照 |

## 开发

```bash
# 一键启动（Windows）
启动.bat

# 仅前端（热更新）
cd frontend && npm run dev

# 仅后端
python -m uvicorn pdf2zh.api:app --host 0.0.0.0 --port 8000 --reload

# 命令行翻译
pdf2zh document.pdf
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
