import { useEffect, useState } from 'react';
import { T } from '../i18n/zh';
import { startTranslation, cancelJob, fetchServices, getJobStatus, getProgressUrl, type Service } from '../api/client';
import { useSSE } from '../hooks/useSSE';
import type { TranslateState, OutputMode, PageRangePreset, TranslateMode, FileInputType } from '../hooks/useTranslate';
import FileUpload from './FileUpload';
import URLInput from './URLInput';
import ServiceSelector from './ServiceSelector';
import EnvKeyInputs from './EnvKeyInputs';
import LanguagePicker from './LanguagePicker';
import OutputModeSelect from './OutputModeSelect';
import PageRange from './PageRange';
import AdvancedOptions from './AdvancedOptions';
import TranslateButton from './TranslateButton';
import ProgressIndicator from './ProgressIndicator';
import DownloadPanel from './DownloadPanel';
import Footer from './Footer';

interface SidebarProps {
  state: TranslateState;
  set: <K extends keyof TranslateState>(key: K, value: TranslateState[K]) => void;
  updateEnv: (key: string, value: string) => void;
}

export default function Sidebar({ state, set, updateEnv }: SidebarProps) {
  const [serviceMeta, setServiceMeta] = useState<Service | null>(null);
  const [sseUrl, setSseUrl] = useState<string | null>(null);

  // 加载服务元数据判断是否显示自定义 prompt
  useEffect(() => {
    fetchServices().then((services) => {
      const svc = services.find((s) => s.name === state.service);
      setServiceMeta(svc || null);
    }).catch(() => setServiceMeta(null));
  }, [state.service]);

  const handleProgressMessage = (data: { progress: number; desc: string; status: string }) => {
    set('progress', data.progress);
    set('progressDesc', data.desc);
    if (data.status === 'complete' || data.status === 'cancelled' || data.status === 'failed') {
      set('status', data.status as TranslateState['status']);
      setSseUrl(null);
      // 获取最终状态以得到文件列表
      if (state.jobId) {
        getJobStatus(state.jobId).then((jobStatus) => {
          set('resultFiles', jobStatus.files);
        }).catch(() => {});
      }
    }
  };

  const handleSSEError = (error: string) => {
    set('error', error);
    set('status', 'failed');
  };

  const { stop: stopSSE } = useSSE({
    url: sseUrl,
    onMessage: handleProgressMessage,
    onError: handleSSEError,
  });

  const handleTranslate = async () => {
    if (!state.file && !state.url) {
      set('error', T.noFile);
      return;
    }

    set('error', null);
    set('status', 'translating');
    set('progress', 0);
    set('progressDesc', T.starting);

    try {
      const formData = new FormData();
      if (state.fileInputType === 'file' && state.file) {
        formData.append('file', state.file);
      } else if (state.fileInputType === 'url' && state.url) {
        formData.append('file', state.url);
      }
      formData.append('service', state.service);
      formData.append('lang_from', state.langFrom);
      formData.append('lang_to', state.langTo);
      formData.append('output_mode', state.outputMode);

      if (state.pageRange === 'custom' && state.customPages) {
        formData.append('custom_pages', state.customPages);
      } else if (state.pageRange !== 'all') {
        formData.append('page_range', state.pageRange);
      }

      formData.append('threads', String(state.threads));
      formData.append('skip_subset_fonts', String(state.skipSubsetFonts));
      formData.append('ignore_cache', String(state.ignoreCache));
      formData.append('vfont', state.vfont);
      formData.append('prompt', state.customPrompt);
      formData.append('mode', state.translateMode);

      if (Object.keys(state.envs).length > 0) {
        formData.append('envs_json', JSON.stringify(state.envs));
      }

      const result = await startTranslation(formData);
      set('jobId', result.job_id);

      // 启动 SSE 连接
      setSseUrl(getProgressUrl(result.job_id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '翻译启动失败';
      set('error', message);
      set('status', 'failed');
    }
  };

  const handleCancel = async () => {
    if (state.jobId) {
      try {
        stopSSE();
        setSseUrl(null);
        await cancelJob(state.jobId);
        set('status', 'cancelled');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '取消失败';
        set('error', message);
      }
    }
  };

  const canTranslate = state.status !== 'translating' && (!!state.file || (state.fileInputType === 'url' && !!state.url.trim()));

  return (
    <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4 p-4 lg:border-r border-slate-200 bg-white lg:h-screen lg:overflow-y-auto">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">
          PDFMathTranslate
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">PDF 数学公式翻译工具</p>
      </div>

      {/* File input type toggle */}
      <div className="flex rounded-lg bg-slate-100 p-0.5 shrink-0">
        {(['file', 'url'] as FileInputType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => set('fileInputType', type)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              state.fileInputType === type
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {type === 'file' ? T.fileTypeFile : T.fileTypeLink}
          </button>
        ))}
      </div>

      {/* File upload or URL input */}
      {state.fileInputType === 'file' ? (
        <FileUpload
          file={state.file}
          onFileSelect={(f) => set('file', f)}
        />
      ) : (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            {T.orInputURL}
          </label>
          <URLInput
            url={state.url}
            onUrlChange={(v) => set('url', v)}
          />
        </div>
      )}

      {/* Service selector */}
      <ServiceSelector
        value={state.service}
        onChange={(v) => set('service', v)}
      />

      {/* API env keys */}
      <EnvKeyInputs
        service={state.service}
        envs={state.envs}
        onEnvChange={updateEnv}
      />

      {/* Language picker */}
      <LanguagePicker
        langFrom={state.langFrom}
        langTo={state.langTo}
        onLangFromChange={(v) => set('langFrom', v)}
        onLangToChange={(v) => set('langTo', v)}
      />

      {/* Output mode */}
      <OutputModeSelect
        value={state.outputMode}
        onChange={(v) => set('outputMode', v)}
      />

      {/* Page range */}
      <PageRange
        pageRange={state.pageRange}
        customPages={state.customPages}
        onPageRangeChange={(v) => set('pageRange', v)}
        onCustomPagesChange={(v) => set('customPages', v)}
      />

      {/* Advanced options */}
      <AdvancedOptions
        threads={state.threads}
        skipSubsetFonts={state.skipSubsetFonts}
        ignoreCache={state.ignoreCache}
        vfont={state.vfont}
        customPrompt={state.customPrompt}
        translateMode={state.translateMode}
        showCustomPrompt={serviceMeta?.custom_prompt ?? false}
        onThreadsChange={(v) => set('threads', v)}
        onSkipSubsetFontsChange={(v) => set('skipSubsetFonts', v)}
        onIgnoreCacheChange={(v) => set('ignoreCache', v)}
        onVfontChange={(v) => set('vfont', v)}
        onCustomPromptChange={(v) => set('customPrompt', v)}
        onTranslateModeChange={(v) => set('translateMode', v)}
      />

      {/* Error display */}
      {state.error && (
        <div className="text-xs text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      {/* Translate button */}
      <TranslateButton
        status={state.status}
        disabled={!canTranslate}
        onTranslate={handleTranslate}
        onCancel={handleCancel}
      />

      {/* Progress */}
      <ProgressIndicator
        progress={state.progress}
        desc={state.progressDesc}
        status={state.status}
      />

      {/* Downloads */}
      {state.jobId && (
        <DownloadPanel
          jobId={state.jobId}
          files={state.resultFiles}
          outputMode={state.outputMode}
          status={state.status}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
