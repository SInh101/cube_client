// @vitest-environment jsdom

import type { CubeStateResponseDto } from '@rubiks-learning/api-contract';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('./components', () => ({
  findChangedCubieIds: () => [],
  CommutatorTeachingPanel: () => null,
  CycleTeachingPanel: () => null,
  DEFAULT_ANIMATION_DURATION_MS: 240,
  AnimationSpeedControl: () => null,
  CubeView: ({ state }: { state: CubeStateResponseDto['state'] }) => (
    <div data-testid="cube-view">{JSON.stringify(state)}</div>
  ),
  FaceControlPanel: () => null,
  SliceControlPanel: () => null,
  MoveSequenceControl: () => null,
  PlaybackControls: () => null,
  PresetManager: () => null,
  PresetPanel: () => null,
}));

const CUBE_ID = '00000000-0000-4000-8000-000000000001';
const STATE = {
  faces: {
    U: Array(9).fill('white'),
    R: Array(9).fill('red'),
    F: Array(9).fill('green'),
    D: Array(9).fill('yellow'),
    L: Array(9).fill('orange'),
    B: Array(9).fill('blue'),
  },
} as unknown as CubeStateResponseDto['state'];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Milestone 5 App integration', () => {
  it('M5-IN-01: Cube取得中はloadingを表示する', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    render(<App />);

    expect(screen.getByText(/loading/i)).toBeTruthy();
    expect(screen.queryByTestId('cube-view')).toBeNull();
  });

  it('M5-IN-02: Cubeを作成、取得し、stateをCubeViewへ渡す', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ cubeId: CUBE_ID }, 201))
      .mockResolvedValueOnce(jsonResponse({ cubeId: CUBE_ID, state: STATE }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('cube-view')).toBeTruthy());
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/api\/cubes$/),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(`/api/cubes/${CUBE_ID}$`),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByTestId('cube-view').textContent).toBe(
      JSON.stringify(STATE),
    );
  });

  it.each([
    ['Cube作成', [jsonResponse({ error: 'failure' }, 500)]],
    [
      'Cube取得',
      [
        jsonResponse({ cubeId: CUBE_ID }, 201),
        jsonResponse({ error: 'failure' }, 500),
      ],
    ],
  ])('M5-IN-03: %s失敗時はerrorを表示する', async (_label, responses) => {
    const fetchMock = vi.fn<typeof fetch>();
    for (const response of responses) fetchMock.mockResolvedValueOnce(response);
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toMatch(/error/i);
    expect(screen.queryByTestId('cube-view')).toBeNull();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
