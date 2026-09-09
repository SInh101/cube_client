// @vitest-environment jsdom

import type { CubeStateResponseDto } from '@rubiks-learning/api-contract';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('./components', () => ({
  findChangedCubieIds: () => [],
  CommutatorTeachingPanel: () => null,
  CycleTeachingPanel: () => null,
  DEFAULT_ANIMATION_DURATION_MS: 240,
  AnimationSpeedControl: ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (value: number) => void;
  }) => (
    <label>
      Animation duration in milliseconds
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  ),
  CubeView: ({
    state,
    animation,
  }: {
    state: CubeStateResponseDto['state'];
    animation?: { durationMs?: number };
  }) => (
    <div
      data-testid="cube-view"
      data-animation-duration={animation?.durationMs}
    >
      {JSON.stringify(state)}
    </div>
  ),
  FaceControlPanel: ({ onMove }: { onMove: (move: string) => void }) => (
    <div>
      {['R', 'L', 'U', 'D', 'F', 'B'].flatMap((face) => [
        <button
          key={`${face}-ccw`}
          type="button"
          aria-label={`${face} counter-clockwise`}
          onClick={() => onMove(`${face}'`)}
        />,
        <button
          key={`${face}-cw`}
          type="button"
          aria-label={`${face} clockwise`}
          onClick={() => onMove(face)}
        />,
      ])}
    </div>
  ),
  SliceControlPanel: () => null,
  MoveSequenceControl: () => null,
  PlaybackControls: () => null,
  PresetManager: () => null,
  PresetPanel: () => null,
}));

const CUBE_ID = '00000000-0000-4000-8000-000000000006';
const INITIAL_STATE = cubeState('white');
const MOVED_STATE = cubeState('red');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Milestone 6 interactive Cube UI', () => {
  it.each(['R', 'L', 'U', 'D', 'F', 'B'])(
    'M6-01: %s buttonを表示する',
    async (move) => {
      stubInitialLoad();
      render(<App />);

      await screen.findByTestId('cube-view');

      expect(
        screen.getByRole('button', { name: `${move} clockwise` }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: `${move} counter-clockwise` }),
      ).toBeTruthy();
    },
  );

  it('M6-02: button操作でMove APIを呼び、response stateを表示する', async () => {
    const fetchMock = stubInitialLoad(MOVED_STATE);
    render(<App />);
    await screen.findByTestId('cube-view');

    fireEvent.click(screen.getByRole('button', { name: 'R clockwise' }));

    await expectMoveRequest(fetchMock, 'R');
    await waitFor(() =>
      expect(screen.getByTestId('cube-view').textContent).toBe(
        JSON.stringify(MOVED_STATE),
      ),
    );
  });

  it('M6-03: R keyでR Moveを送る', async () => {
    const fetchMock = stubInitialLoad(MOVED_STATE);
    render(<App />);
    await screen.findByTestId('cube-view');

    fireEvent.keyDown(window, { key: 'r' });

    await expectMoveRequest(fetchMock, 'R');
  });

  it("M6-04: Shift + R keyでR' Moveを送る", async () => {
    const fetchMock = stubInitialLoad(MOVED_STATE);
    render(<App />);
    await screen.findByTestId('cube-view');

    fireEvent.keyDown(window, { key: 'R', shiftKey: true });

    await expectMoveRequest(fetchMock, "R'");
  });

  it('M6-05: 対応外keyではMove APIを呼ばない', async () => {
    const fetchMock = stubInitialLoad();
    render(<App />);
    await screen.findByTestId('cube-view');

    fireEvent.keyDown(window, { key: 'x' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('M6-06: Move API失敗時は現在のCubeを保ちerrorを表示する', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ cubeId: CUBE_ID }, 201))
      .mockResolvedValueOnce(
        jsonResponse({ cubeId: CUBE_ID, state: INITIAL_STATE }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: 'failure' }, 500));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByTestId('cube-view');

    fireEvent.click(screen.getByRole('button', { name: 'R clockwise' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('cube-view').textContent).toBe(
      JSON.stringify(INITIAL_STATE),
    );
  });

  it('M6-07: GUIで選んだ速度を次のMove animationへ反映する', async () => {
    stubInitialLoad(MOVED_STATE);
    render(<App />);
    await screen.findByTestId('cube-view');

    fireEvent.change(
      screen.getByLabelText('Animation duration in milliseconds'),
      {
        target: { value: '730' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'R clockwise' }));

    await waitFor(() =>
      expect(screen.getByTestId('cube-view').dataset.animationDuration).toBe(
        '730',
      ),
    );
  });
});

function stubInitialLoad(moveState?: CubeStateResponseDto['state']) {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(jsonResponse({ cubeId: CUBE_ID }, 201))
    .mockResolvedValueOnce(
      jsonResponse({ cubeId: CUBE_ID, state: INITIAL_STATE }),
    );
  if (moveState !== undefined) {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ cubeId: CUBE_ID, state: moveState }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function expectMoveRequest(
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  move: string,
): Promise<void> {
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(fetchMock).toHaveBeenNthCalledWith(
    3,
    expect.stringMatching(`/api/cubes/${CUBE_ID}/moves$`),
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'content-type': 'application/json' }),
      body: JSON.stringify({ move }),
    }),
  );
}

function cubeState(frontCenter: 'white' | 'red') {
  return {
    faces: {
      U: Array(9).fill('white'),
      R: Array(9).fill('red'),
      F: [
        'green',
        'green',
        'green',
        'green',
        frontCenter,
        'green',
        'green',
        'green',
        'green',
      ],
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      B: Array(9).fill('blue'),
    },
  } as unknown as CubeStateResponseDto['state'];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
