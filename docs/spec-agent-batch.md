# Spec: AI Agent API 适配 + 批量翻译

## Objective

两个相互关联的功能改进：

### Feature A: AI Agent API 适配
让 Claude Code、Hermes 等 AI 编程 agent 能够将 PDFMathTranslate 作为翻译工具直接调用。
核心目标：
1. **MCP Server 完善** — 现有 MCP server 只支持 Google 翻译，需支持所有服务商、API key 配置、side-by-side 输出
2. **首次使用向导** — 当 agent 首次调用且无持久化配置时，引导用户选择翻译服务商并配置 API key，配置持久化后不再出现
3. **默认 side 输出** — 默认输出改为左右对照 (side-by-side) 模式

### Feature B: 批量翻译
支持一次上传/选择多个 PDF 文件并发翻译。
核心目标：
1. **新增批量 API 端点** — `POST /api/translate-batch` 接受多个文件
2. **前端批量 UI** — 多文件拖拽/选择 + 批量进度列表
3. **后端并发处理** — 利用现有 ThreadPoolExecutor 并发翻译多个文件

### 用户故事
- **Agent 用户**: "我用 Claude Code 处理一批 PDF 论文，想一键翻译成中文左右对照版，第一次使用时引导我配置 DeepSeek API key"
- **Web 用户**: "我有 10 篇论文要翻译，不想一个一个上传等待，希望拖入文件夹批量处理"
- **开发者**: "我把 PDFMathTranslate 作为 MCP tool 集成到自己的 agent 工作流中"

---

## Assumptions

1. 核心翻译引擎（translator、converter、layout）保持稳定不变
2. 不更改现有单文件 API 的签名（向后兼容）
3. MCP server 以 stdio 模式被 agent 调用（Claude Desktop / Code 的标准 MCP 集成方式）
4. 首次配置向导通过 MCP tools 交互触发，而非独立 UI
5. 批量翻译的前端 UI 复用现有组件（ProgressIndicator、DownloadPanel 等）
6. ConfigManager 的 JSON 持久化继续使用 `~/.config/PDFMathTranslate/config.json`

---

## Tech Stack

与现有项目一致：
- **Backend**: Python 3.10+, FastAPI + uvicorn, pdfminer, pymupdf
- **Frontend**: React 19, TypeScript 6, Tailwind CSS 4, Vite 8
- **MCP**: mcp >= 1.0.0 (fastmcp)
- **Testing**: pytest (Python), vitest (frontend)

---

## Commands

```bash
# Backend
python -m pdf2zh.mcp_server              # MCP stdio mode (agent 调用)
python -m pdf2zh.mcp_server --sse        # MCP SSE mode (开发调试)
python launch.py                          # FastAPI + Vite 一键启动

# Testing
python -m pytest test/ -x -v              # Python 测试
cd frontend && npm test                   # 前端测试

# Build
cd frontend && npm run build              # 前端生产构建

# Lint
cd frontend && npm run lint               # ESLint
```

---

## Project Structure (changes only)

```
pdf2zh/
  mcp_server.py          → [MODIFY] 增强 MCP tools: 列出服务、配置向导、多服务商翻译
  api.py                 → [MODIFY] 新增 POST /api/translate-batch, 默认 output_mode=side
  high_level.py          → [MODIFY] translate() 返回 side_bytes 路径（已有），不改核心逻辑
  config.py              → [MODIFY] 新增 is_configured() 方法检测是否完成首次配置
  translator.py          → [MODIFY] 确保所有 translator __init__ 统一 envs 处理
frontend/src/
  components/
    FileDropZone.tsx      → [MODIFY] 支持多文件选择 (multiple)
    BatchProgressList.tsx → [NEW] 批量翻译进度列表组件
    BatchDownloadPanel.tsx→ [NEW] 批量下载面板（打包 zip 或逐个下载）
    Sidebar.tsx           → [MODIFY] 默认 outputMode='side'
  hooks/
    useBatchTranslation.ts→ [NEW] 批量翻译编排 hook
  reducers/
    translateReducer.ts   → [MODIFY] 新增 batch jobs 状态管理
  api/
    client.ts             → [MODIFY] 新增 uploadBatch() / getBatchStatus()
test/
  test_mcp_server.py      → [NEW] MCP server 测试
  test_batch_api.py       → [NEW] 批量 API 测试
```

---

## Code Style

延续现有代码风格。关键约定：

```python
# Python: 与 pdf2zh/translator.py 一致的风格
class NewTranslator(BaseTranslator):
    name = "new"
    envs = {"NEW_API_KEY": None, "NEW_MODEL": "default-model"}
    CustomPrompt = True  # if LLM-based

    def __init__(self, lang_in, lang_out, model, envs=None, **kwargs):
        self.set_envs(envs)
        super().__init__(lang_in, lang_out, model)
        self.options = {"temperature": 0.1, "num_predict": 2048}

    def do_translate(self, text):
        ...
```

```typescript
// TypeScript: 与 translateReducer.ts 一致的 reducer 模式
type BatchState = {
  jobs: Record<string, BatchJob>;
  overallProgress: number;
};

type TranslateAction =
  | { type: 'ADD_BATCH_FILES'; files: File[] }
  | { type: 'BATCH_JOB_PROGRESS'; jobId: string; progress: number }
  | ...
```

---

## Testing Strategy

- **Python 后端** (`test/`): pytest
  - `test_mcp_server.py` — MCP tool 调用测试（mock translator、配置读写）
  - `test_batch_api.py` — 批量 API 端点测试（多文件上传、进度轮询、下载）
- **前端** (`frontend/src/`): vitest
  - `translateReducer.test.ts` — 扩展测试覆盖新 batch actions
  - 组件测试：BatchProgressList、FileDropZone 多文件模式
- 覆盖率目标：新代码 ≥ 85%
- 所有测试必须在提交前通过

---

## Boundaries

### Always do
- 运行全量测试后再提交: `python -m pytest test/ -x -v` + `cd frontend && npm test`
- 遵循现有命名约定和代码风格
- 保持向后兼容：现有 API 端点签名不变
- 新功能添加回归测试

### Ask first
- 添加新的 pip/npm 依赖（如 archiver/zip 库）
- 修改 ConfigManager 的 JSON schema（可能影响现有用户配置）
- 更改现有 translator 的 `__init__` 签名
- MCP tool 的命名和参数设计

### Never do
- 提交 API key 或 secret
- 删除或降级现有测试
- 修改 pdfminer/pymupdf 等第三方库的 vendored 代码

---

## Feature A Spec: AI Agent API 适配

### A.1 MCP Server 增强

**现状**: `mcp_server.py` 只有一个 `translate_pdf` tool，硬编码 `service="google"`，不支持配置。

**目标设计**:

#### Tool 1: `translate_pdf` (增强)
```
参数:
  file: str          — PDF/Word 文件绝对路径 (必填)
  lang_in: str       — 源语言，如 "en", "zh", "auto"
  lang_out: str      — 目标语言
  service: str       — 翻译服务商名称，默认从 ConfigManager 读取
  output_mode: str   — "mono", "dual", "side"，默认 "side"
  thread: int        — 线程数，默认 4

行为:
  1. 如果未指定 service，从 ConfigManager 读取最后使用的服务商
  2. 如果 ConfigManager 无配置 → 调用 setup_wizard tool 引导配置
  3. 读取对应服务商的 envs (API key 等)
  4. 执行翻译，返回 side/mono/dual 文件路径

返回:
  翻译完成信息 + 输出文件绝对路径列表
```

#### Tool 2: `list_services`
```
列出所有可用翻译服务商及其所需配置项。
返回 JSON: [{name, envs, custom_prompt, free}]
```

#### Tool 3: `setup_wizard` (首次使用向导)
```
检测 ConfigManager 是否已有配置。
若无配置:
  1. 列出服务商供用户选择（免费优先：Google/Bing）
  2. 引导用户输入 API key 等必要信息
  3. 调用 test_service 验证连接
  4. 持久化到 ConfigManager
若已有配置:
  返回当前配置摘要，询问是否需要修改
```

#### Tool 4: `test_service`
```
测试指定服务商的翻译连接。
参数: service_name, api_key, model (可选)
返回: {ok: bool, latency_ms: int, sample_result: str}
```

#### Tool 5: `translate_batch` (批量翻译，关联 Feature B)
```
参数:
  files: list[str]   — PDF 文件路径列表
  ... (同 translate_pdf 的其他参数)

行为:
  并发翻译多个文件（受线程池限制，最多同时 4 个）
  返回每个文件的翻译结果列表
```

### A.2 首次使用检测逻辑

```
ConfigManager.first_time_setup_complete() -> bool:
  检查 config.json 是否存在
  检查 translators 数组是否有至少一个翻译器配置了 API key
  → True: 已配置，跳过向导
  → False: 触发 setup_wizard
```

### A.3 默认输出模式

以下位置将默认 `output_mode` 从 `"mono_dual"` 改为包括 `"side"`:
- `high_level.py:translate_stream()` — 参数默认值 `output_mode="side"`
- `high_level.py:translate()` — 同上
- `api.py:translate()` — Form 默认值 `output_mode="side"`
- `mcp_server.py:translate_pdf()` — 默认 `output_mode="side"`
- `frontend/src/reducers/translateReducer.ts:initialState` — `outputMode: 'side'`

---

## Feature B Spec: 批量翻译

### B.1 后端: 批量 API 端点

#### `POST /api/translate-batch`
```
Content-Type: multipart/form-data
参数:
  files: UploadFile[]   — 多个 PDF 文件 (必填，最多 20 个)
  service, lang_from, lang_to, ... — 同单文件 API
  output_mode: str       — 默认 "side"

响应:
  {
    batch_id: str,
    jobs: [
      { job_id: str, filename: str, status: "queued" },
      ...
    ]
  }

行为:
  1. 为每个文件创建独立的 job (复用现有 job 字典)
  2. 所有 job 共享同一个 service/lang/envs 配置
  3. 提交到 ThreadPoolExecutor（最多 4 并发）
  4. 返回 batch_id + 所有 job_id 列表
```

#### `GET /api/translate-batch/{batch_id}`
```
返回 batch 下所有 job 的状态:
  {
    batch_id: str,
    overall_progress: float,  // 0.0 ~ 1.0
    jobs: [{ job_id, filename, status, progress, error, files }]
  }
```

#### `GET /api/translate-batch/{batch_id}/download`
```
打包所有已完成文件的 side PDF 为 zip 并下载。
参数:
  file_type: str — "mono" / "dual" / "side"，默认 "side"
```

### B.2 前端: 批量 UI

#### FileDropZone 改造
```
- multiple 属性支持多文件选择
- 拖入文件夹时扫描所有 PDF
- 显示文件列表（文件名 + 大小 + 移除按钮）
- 最大 20 个文件限制
```

#### BatchProgressList 组件
```
- 整体进度条（已完成/总数）
- 每个文件的独立进度行：
  [文件名] [进度条] [状态标签: queued/running/completed/failed]
- 支持单个取消（如 API 支持）
- 失败文件显示错误信息 + 重试按钮
```

#### BatchDownloadPanel 组件
```
- "下载全部 side PDF (zip)" 按钮
- 展开列表：每个文件单独下载链接
- 下载全部 mono / 下载全部 dual 选项
```

#### useBatchTranslation hook
```
start(files: File[], options: TranslateOptions) → batch_id
  - 序列化选项为 FormData
  - XHR 上传多个文件 → 获取 batch_id
  - 启动 SSE 监听所有 job 的进度
  - 更新 BatchState

cancel(batch_id)
  - 逐个取消 batch 下所有 running job
```

### B.3 状态管理 (translateReducer)

```typescript
// 新增类型
interface BatchJob {
  jobId: string;
  filename: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  resultFiles?: Record<string, string>;
}

// 扩展 TranslateState
interface TranslateState {
  // ...existing fields
  batchMode: boolean;
  batchJobs: BatchJob[];
  batchId: string | null;
  batchOverallProgress: number;
}
```

---

## Success Criteria

### Feature A
- [ ] MCP server 的 `translate_pdf` 支持所有 20+ 翻译服务商（不仅 Google）
- [ ] `setup_wizard` tool 在无配置时引导用户完成服务商选择和 API key 配置
- [ ] 配置持久化后，后续调用不再显示向导
- [ ] 默认输出为 side-by-side 模式
- [ ] MCP tools 有清晰的 docstring 供 agent 理解参数
- [ ] Agent 可以用一条命令完成 "翻译这篇论文为中文左右对照版"

### Feature B
- [ ] `POST /api/translate-batch` 接受最多 20 个文件，返回 batch_id
- [ ] 批量翻译中每个文件独立追踪进度
- [ ] 前端支持多文件拖拽/选择 + 批量进度列表
- [ ] 支持打包下载全部结果 (zip)
- [ ] 单文件翻译流程不受影响（向后兼容）
- [ ] ThreadPoolExecutor max_workers=4 限制不被突破

---

## Open Questions

1. **Zip 打包依赖**: 批量下载使用 Python stdlib `zipfile`（无需额外依赖），还是
   前端用 JSZip 在前端打包？→ 建议 Python 后端 zip，前端只需一个下载链接
2. **批量取消粒度**: 是否支持取消 batch 中的单个文件？→ 建议 Phase 1 只支持
   全部取消，单文件取消在后续迭代
3. **--dir 与批量 API 的关系**: CLI 的 `--dir` 是否复用新的批量 API？→ 建议
   保持独立，`--dir` 是 CLI 便利功能，批量 API 是 Web/Agent 接口
4. **MCP tool 命名**: `setup_wizard` vs `configure` vs `first_time_setup`？
   → 倾向 `configure_service` (更专业)

---

> 请审核以上规范。确认后进入 Phase 2: Plan（技术实现计划）。
