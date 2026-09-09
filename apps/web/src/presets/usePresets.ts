import type {
  CreatePresetRequestDto,
  PresetListResponseDto,
  PresetResponseDto,
  UpdatePresetRequestDto,
} from '@rubiks-learning/api-contract';
import { useCallback, useEffect, useState } from 'react';
export type PresetStatus = 'loading' | 'ready' | 'saving' | 'error';
export function usePresets(apiBaseUrl: string) {
  const [presets, setPresets] = useState<readonly PresetResponseDto[]>([]);
  const [status, setStatus] = useState<PresetStatus>('loading');
  const [error, setError] = useState<string>();
  const request = useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const response = await fetch(`${apiBaseUrl}/api/presets${path}`, init);
      if (!response.ok)
        throw new Error(`Preset request failed: ${response.status}`);
      return response.status === 204
        ? (undefined as T)
        : (response.json() as Promise<T>);
    },
    [apiBaseUrl],
  );
  const load = useCallback(async () => {
    setStatus('loading');
    setError(undefined);
    try {
      const dto = await request<PresetListResponseDto>('');
      setPresets(dto.presets);
      setStatus('ready');
    } catch {
      setError('Could not load presets.');
      setStatus('error');
    }
  }, [request]);
  useEffect(() => {
    void load();
  }, [load]);
  const mutate = useCallback(
    async <T>(
      operation: () => Promise<T>,
      update: (value: T) => readonly PresetResponseDto[],
    ) => {
      setStatus('saving');
      setError(undefined);
      try {
        const value = await operation();
        setPresets(update(value));
        setStatus('ready');
      } catch {
        setError('Could not save preset.');
        setStatus('error');
      }
    },
    [],
  );
  const create = useCallback(
    (input: CreatePresetRequestDto) =>
      mutate(
        () => request<PresetResponseDto>('', json('POST', input)),
        (value) => [...presets, value],
      ),
    [mutate, presets, request],
  );
  const update = useCallback(
    (id: string, input: UpdatePresetRequestDto) =>
      mutate(
        () => request<PresetResponseDto>(`/${id}`, json('PATCH', input)),
        (value) => presets.map((p) => (p.id === id ? value : p)),
      ),
    [mutate, presets, request],
  );
  const remove = useCallback(
    (id: string) =>
      mutate(
        () => request<void>(`/${id}`, { method: 'DELETE' }),
        () => presets.filter((p) => p.id !== id),
      ),
    [mutate, presets, request],
  );
  return { presets, status, error, load, create, update, remove };
}
function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
