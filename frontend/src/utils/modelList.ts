/**
 * Known model names per service key suffix.
 * Users can still type custom model names — the dropdown provides quick selection.
 */

const MODEL_MAP: Record<string, string[]> = {
  deepseek: [
    'deepseek-chat',
    'deepseek-v4-pro',
    'deepseek-v4-flash',
    'deepseek-reasoner',
  ],
  openai: [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'o4-mini',
    'o3',
    'o3-mini',
  ],
  azure_openai: [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4.1',
    'gpt-4.1-mini',
  ],
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ],
  grok: [
    'grok-3',
    'grok-3-lite',
  ],
  groq: [
    'llama-4-scout-17b-16e-instruct',
    'llama-4-maverick-17b-128e-instruct',
    'deepseek-r1-distill-llama-70b',
    'qwen-3-32b',
    'mixtral-8x7b-32768',
  ],
  zhipu: [
    'glm-4.5',
    'glm-4.5-flash',
    'glm-4-plus',
    'glm-4-flash',
  ],
  modelscope: [
    'qwen-max',
    'qwen-plus',
    'qwen-turbo',
    'deepseek-v4',
    'deepseek-r1',
  ],
  silicon: [
    'Pro/deepseek-ai/DeepSeek-V3',
    'deepseek-ai/DeepSeek-V3',
  ],
  minimax: [
    'abab6.5s-chat',
    'abab7-chat',
  ],
  ollama: [
    'llama3.3',
    'llama4',
    'qwen3',
    'deepseek-r1',
    'gemma3',
    'mistral',
  ],
  xinference: [
    'qwen2.5',
    'llama3.1',
    'deepseek-v3',
  ],
  dify: [] as string[],
  anythingllm: [] as string[],
  x302ai: [] as string[],
};

export function getModelSuggestions(serviceName: string): string[] {
  return MODEL_MAP[serviceName.toLowerCase()] || [];
}
