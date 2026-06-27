const API_BASE = '/api';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Wraps fetch with an AbortSignal timeout. */
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export interface ServiceEnv {
  key: string;
  default: string;
  is_api_key: boolean;
}

export interface Service {
  name: string;
  envs: ServiceEnv[];
  custom_prompt: boolean;
}

export interface Language {
  name: string;
  code: string;
}

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'translating' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  desc: string;
  files: Record<string, string>;
  error?: string;
}

export interface SSEProgressEvent {
  progress: number;
  desc: string;
  status: string;
}

export async function fetchServices(): Promise<Service[]> {
  const res = await fetchWithTimeout(`${API_BASE}/services`);
  if (!res.ok) throw new Error(`获取服务列表失败: ${res.status}`);
  const data = await res.json();
  return data.services;
}

export async function fetchLanguages(): Promise<Language[]> {
  const res = await fetchWithTimeout(`${API_BASE}/languages`);
  if (!res.ok) throw new Error(`获取语言列表失败: ${res.status}`);
  const data = await res.json();
  return data.languages;
}

/**
 * Upload with progress reporting. Uses XMLHttpRequest so we can track
 * upload progress for large files.
 */
export function startTranslationWithProgress(
  formData: FormData,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<{ job_id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/translate`);
    xhr.timeout = DEFAULT_TIMEOUT_MS;

    const onAbort = () => {
      xhr.abort();
      reject(new Error('上传已取消'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    const onProgressHandler = (e: ProgressEvent<XMLHttpRequestEventTarget>) => {
      if (e.lengthComputable) {
        onProgress(e.loaded / e.total);
      }
    };
    xhr.upload.addEventListener('progress', onProgressHandler);

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      xhr.upload.removeEventListener('progress', onProgressHandler);
    };

    xhr.addEventListener('load', () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('服务器返回无效响应'));
        }
      } else {
        let detail = '未知错误';
        try {
          const err = JSON.parse(xhr.responseText);
          detail = err.detail || detail;
        } catch { /* use default */ }
        reject(new Error(detail || `Request failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      cleanup();
      reject(new Error('上传网络错误'));
    });

    xhr.addEventListener('abort', () => {
      cleanup();
      reject(new Error('上传已取消'));
    });

    xhr.send(formData);
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetchWithTimeout(`${API_BASE}/translate/${jobId}`);
  if (!res.ok) throw new Error(`获取任务状态失败: ${res.status}`);
  return res.json();
}

export function getProgressUrl(jobId: string): string {
  return `${API_BASE}/translate/${jobId}/progress`;
}

export function getDownloadUrl(jobId: string, fileType: string): string {
  return `${API_BASE}/download/${jobId}/${fileType}`;
}

export interface TestResult {
  status: 'ok' | 'error';
  service: string;
  result?: string;
  elapsed_ms?: number;
  error?: string;
}

export async function cancelJob(jobId: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/cancel/${jobId}`, { method: 'POST' });
  if (!res.ok) throw new Error(`取消任务失败: ${res.status}`);
}

export async function testService(service: string, envs: Record<string, string>): Promise<TestResult> {
  const formData = new FormData();
  formData.append('service', service);
  formData.append('envs_json', JSON.stringify(envs));
  const res = await fetchWithTimeout(`${API_BASE}/test-service`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '未知错误' }));
    throw new Error(err.detail || `测试失败: ${res.status}`);
  }
  return res.json();
}

// ── Batch API ────────────────────────────────────────────────────────────

export interface BatchJobInfo {
  job_id: string;
  filename: string;
  status: string;
  progress: number;
  error?: string;
  result_files?: Record<string, string>;
}

export interface BatchStatus {
  batch_id: string;
  overall_progress: number;
  completed: number;
  total: number;
  jobs: BatchJobInfo[];
}

/**
 * Upload multiple files for batch translation.
 * Uses XHR for upload progress reporting.
 */
export function startBatchTranslation(
  formData: FormData,
  onProgress: (pct: number) => void,
): Promise<{ batch_id: string; jobs: { job_id: string; filename: string; status: string }[] }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/translate-batch`);
    xhr.timeout = DEFAULT_TIMEOUT_MS;

    const onProgressHandler = (e: ProgressEvent<XMLHttpRequestEventTarget>) => {
      if (e.lengthComputable) {
        onProgress(e.loaded / e.total);
      }
    };
    xhr.upload.addEventListener('progress', onProgressHandler);

    const cleanup = () => {
      xhr.upload.removeEventListener('progress', onProgressHandler);
    };

    xhr.addEventListener('load', () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('服务器返回无效响应'));
        }
      } else {
        let detail = '未知错误';
        try {
          const err = JSON.parse(xhr.responseText);
          detail = err.detail || detail;
        } catch { /* use default */ }
        reject(new Error(detail || `Batch request failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      cleanup();
      reject(new Error('批量上传网络错误'));
    });

    xhr.addEventListener('abort', () => {
      cleanup();
      reject(new Error('批量上传已取消'));
    });

    xhr.send(formData);
  });
}

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  const res = await fetchWithTimeout(`${API_BASE}/translate-batch/${batchId}`);
  if (!res.ok) throw new Error(`获取批量状态失败: ${res.status}`);
  return res.json();
}

export function getBatchDownloadUrl(batchId: string, fileType: string = 'side'): string {
  return `${API_BASE}/translate-batch/${batchId}/download?file_type=${fileType}`;
}
