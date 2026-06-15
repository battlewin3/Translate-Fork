import { useEffect, useRef, useCallback } from 'react';

interface SSEOptions {
  url: string | null;
  onMessage: (data: { progress: number; desc: string; status: string }) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export function useSSE({ url, onMessage, onError, onComplete }: SSEOptions) {
  const abortRef = useRef<AbortController | null>(null);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onCompleteRef = useRef(onComplete);

  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  onCompleteRef.current = onComplete;

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const connect = async () => {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        });

        if (!response.ok) {
          throw new Error(`SSE 连接失败: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应流');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // SSE events are separated by double newlines
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            const lines = event.split('\n');
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                dataStr += line.slice(6);
              } else if (line.startsWith('data:')) {
                dataStr += line.slice(5);
              }
            }
            if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                onMessageRef.current(data);
                if (data.status === 'complete' || data.status === 'cancelled' || data.status === 'failed') {
                  onCompleteRef.current?.();
                  reader.cancel();
                  return;
                }
              } catch {
                // 跳过无效 JSON
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'SSE 连接错误';
        onErrorRef.current?.(message);
      }
    };

    connect();

    return () => {
      controller.abort();
    };
  }, [url]);

  return { stop };
}
