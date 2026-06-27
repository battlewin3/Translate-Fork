# PDFMathTranslate Frontend

React 19 + TypeScript 6 + Vite 8 SPA for the PDFMathTranslate translation engine.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 6 |
| Bundler | Vite 8 (Rolldown) |
| Styling | Tailwind CSS 4 |
| Testing | Vitest 4 |
| Linting | ESLint 9 |

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:8000` (see `vite.config.ts`).

## Project Structure

```
src/
  api/              API client (fetch + XHR with progress)
    client.ts       All backend API calls
  components/       React components
    TranslateButton.tsx
    FileDropZone.tsx      Drag-and-drop PDF/DOCX upload
    ServiceSelector.tsx   Searchable dropdown with 25 services
    EnvKeyInputs.tsx      API key input with show/hide toggle
    Sidebar.tsx           Settings panel (service, language, output, advanced)
    HistoryDrawer.tsx     Job history with download links
    ProgressIndicator.tsx Translation progress bar
    ...
  hooks/            Custom hooks
    useTranslation.ts     Translation lifecycle (upload → SSE → download)
    useSSE.ts             Server-Sent Events client
    useJobHistory.ts      Client-side job history persistence
    useServiceList.ts     Fetch available services from API
    useLanguageList.ts    Fetch supported languages from API
  i18n/             Internationalization
    en.ts | zh.ts         49 translation keys each
    useT.ts                Hook returning T function
    context.tsx            Locale context provider
  reducers/         State management
    translateReducer.ts   Single reducer for all translation state
  utils/            Utilities
    preferences.ts  localStorage persistence (NO API keys)
  styles/           Global CSS + Tailwind
```

## Available Scripts

```bash
npm run dev        # Start dev server with HMR
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm test           # Run tests (Vitest)
npm run lint       # ESLint check
```

## Architecture Notes

- **State management**: Single `useReducer` + React Context — no Redux/Zustand needed for this scope
- **i18n**: Context-based locale switching; all user-facing strings go through `useT()` hook
- **API key security**: API keys are never persisted to localStorage; they're sent to the backend for one-time validation via `POST /api/test-service` and stored server-side in `~/.config/PDFMathTranslate/config.json` (0600 permissions)
- **SSE progress**: Real-time translation progress via `EventSource` with automatic fallback to polling after connection failures
- **Batch translation**: Multi-file upload via `FormData` with XHR `progress` events; results downloadable as individual files or ZIP
