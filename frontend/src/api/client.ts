const API_BASE = '/api';

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

export interface ProgressEvent {
  progress: number;
  desc: string;
  status: string;
}

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch(`${API_BASE}/services`);
  if (!res.ok) throw new Error(`获取服务列表失败: ${res.status}`);
  const data = await res.json();
  return data.services;
}

export async function fetchLanguages(): Promise<Language[]> {
  const res = await fetch(`${API_BASE}/languages`);
  if (!res.ok) throw new Error(`获取语言列表失败: ${res.status}`);
  const data = await res.json();
  return data.languages;
}

export async function startTranslation(formData: FormData): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '未知错误' }));
    throw new Error(err.detail || `请求失败: ${res.status}`);
  }
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/translate/${jobId}`);
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
  const res = await fetch(`${API_BASE}/cancel/${jobId}`, { method: 'POST' });
  if (!res.ok) throw new Error(`取消任务失败: ${res.status}`);
}

export async function testService(service: string, envs: Record<string, string>): Promise<TestResult> {
  const formData = new FormData();
  formData.append('service', service);
  formData.append('envs_json', JSON.stringify(envs));
  const res = await fetch(`${API_BASE}/test-service`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '未知错误' }));
    throw new Error(err.detail || `测试失败: ${res.status}`);
  }
  return res.json();
}
