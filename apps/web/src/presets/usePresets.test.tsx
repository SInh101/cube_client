// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePresets } from './usePresets';
afterEach(() => vi.unstubAllGlobals());
describe('usePresets', () => {
  it('REST一覧を保持し、mutation結果だけを反映する', async () => {
    const preset = {
      id: '1',
      name: 'A',
      moves: 'R',
      createdAt: 'x',
      updatedAt: 'x',
    };
    const created = { ...preset, id: '2', name: 'B' };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ presets: [preset] }))
      .mockResolvedValueOnce(json(created));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => usePresets(''));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(() => result.current.create({ name: 'B', moves: 'R' }));
    expect(result.current.presets).toEqual([preset, created]);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/presets',
      expect.objectContaining({ method: 'POST' }),
    );
  });
  it('load失敗時も既存一覧を消さない', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ presets: [] }))
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => usePresets(''));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(() => result.current.load());
    expect(result.current.status).toBe('error');
    expect(result.current.presets).toEqual([]);
  });
});
function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
