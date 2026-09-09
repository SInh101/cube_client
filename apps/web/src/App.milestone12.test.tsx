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
  DEFAULT_ANIMATION_DURATION_MS: 240,
  AnimationSpeedControl: () => null,
  FaceControlPanel: () => null,
  SliceControlPanel: () => null,
  MoveSequenceControl: () => null,
  PresetPanel: () => null,
  findChangedCubieIds: (before: unknown, after: unknown) =>
    before === after ? [] : ['changed-cubie'],
  CubeView: ({
    animation,
    highlightedCubieIds,
    dimUnhighlighted,
    onAnimationComplete,
  }: {
    animation?: { id: number };
    highlightedCubieIds?: readonly string[];
    dimUnhighlighted?: boolean;
    onAnimationComplete?: (id: number) => void;
  }) => (
    <div>
      <output aria-label="Highlighted cubies">
        {highlightedCubieIds?.join(',') ?? ''}
      </output>
      <output aria-label="Dim unhighlighted">{String(dimUnhighlighted)}</output>
      <output aria-label="Animation id">{animation?.id}</output>
      <button
        type="button"
        aria-label="Complete animation"
        onClick={() => animation && onAnimationComplete?.(animation.id)}
      />
    </div>
  ),
  PlaybackControls: ({
    moveCount,
    onNext,
  }: {
    moveCount: number;
    onNext: () => void;
  }) => (
    <div>
      <output aria-label="Playback move count">{moveCount}</output>
      <button type="button" onClick={onNext}>
        Next
      </button>
    </div>
  ),
  CommutatorTeachingPanel: ({
    definition,
    activePart,
    onPrepare,
    onPlay,
    onPlayNextPart,
  }: {
    definition?: { sequence: string };
    activePart?: string;
    onPrepare: (a: string, b: string) => void;
    onPlay: () => void;
    onPlayNextPart: () => void;
  }) => (
    <div>
      <output aria-label="Prepared commutator">{definition?.sequence}</output>
      <output aria-label="Active commutator part">{activePart}</output>
      <button type="button" onClick={() => onPrepare('R', 'U')}>
        Prepare commutator
      </button>
      <button type="button" onClick={onPlay}>
        Play commutator
      </button>
      <button type="button" onClick={onPlayNextPart}>
        Play next part
      </button>
    </div>
  ),
  CycleTeachingPanel: () => null,
}));

const CUBE_ID = '00000000-0000-4000-8000-000000000012';
const INITIAL_STATE = solvedState();
const MOVED_STATE = {
  faces: {
    ...INITIAL_STATE.faces,
    F: INITIAL_STATE.faces.F.map((color, index) =>
      index === 0 ? 'red' : color,
    ),
  },
} as unknown as CubeStateResponseDto['state'];
const DEFINITION = {
  sequence: "R D U D' R' U'",
  moves: ['R', 'D', 'U', "D'", "R'", "U'"],
  boundaries: [
    { part: 'A', startIndex: 0, endIndex: 2, moves: ['R', 'D'] },
    { part: 'B', startIndex: 2, endIndex: 3, moves: ['U'] },
    {
      part: 'A_INVERSE',
      startIndex: 3,
      endIndex: 5,
      moves: ["D'", "R'"],
    },
    { part: 'B_INVERSE', startIndex: 5, endIndex: 6, moves: ["U'"] },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Milestone 12 commutator teaching integration', () => {
  it('M12-UI-03: RESTで準備して変化したCubie IDをCubeViewへ渡す', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await openAnalysis();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Prepare commutator' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Prepared commutator').textContent).toBe(
        DEFINITION.sequence,
      ),
    );
    expect(fetchMock).toHaveBeenLastCalledWith('/api/commutators', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 'R', b: 'U' }),
    });

    const playButton = screen.getByRole('button', {
      name: 'Play commutator',
    }) as HTMLButtonElement;
    await waitFor(() => expect(playButton.disabled).toBe(false));
    fireEvent.click(playButton);
    await waitFor(() =>
      expect(screen.getByLabelText('Highlighted cubies').textContent).toBe(
        'changed-cubie',
      ),
    );
    expect(screen.getByLabelText('Dim unhighlighted').textContent).toBe('true');
  });

  it('M12-UI-04: 部分境界を越えると強調表示を更新する', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await openAnalysis();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Prepare commutator' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Active commutator part').textContent).toBe(
        'A',
      ),
    );
    const playButton = screen.getByRole('button', {
      name: 'Play commutator',
    }) as HTMLButtonElement;
    await waitFor(() => expect(playButton.disabled).toBe(false));
    fireEvent.click(playButton);
    await waitFor(() =>
      expect(screen.getByLabelText('Highlighted cubies').textContent).toBe(
        'changed-cubie',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete animation' }));
    expect(moveRequestCount(fetchMock)).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Complete animation' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Active commutator part').textContent).toBe(
        'B',
      ),
    );
  });

  it('M12-RG-01: 同じ交換子を再準備すると先頭部分へ戻る', async () => {
    vi.stubGlobal('fetch', createFetchMock());
    render(<App />);
    await openAnalysis();

    const prepareButton = await screen.findByRole('button', {
      name: 'Prepare commutator',
    });
    fireEvent.click(prepareButton);
    await waitFor(() =>
      expect(screen.getByLabelText('Playback move count').textContent).toBe(
        '6',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Highlighted cubies').textContent).toBe(
        'changed-cubie',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete animation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Highlighted cubies').textContent).toBe(
        'changed-cubie',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete animation' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Active commutator part').textContent).toBe(
        'B',
      ),
    );

    fireEvent.click(prepareButton);
    await waitFor(() =>
      expect(screen.getByLabelText('Active commutator part').textContent).toBe(
        'A',
      ),
    );
  });

  it('M12-PB-02: Play next partは現在部分の終端で停止する', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await openAnalysis();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Prepare commutator' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Playback move count').textContent).toBe(
        '6',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play next part' }));
    await waitFor(() => expect(moveRequestCount(fetchMock)).toBe(1));
    await waitFor(() =>
      expect(screen.getByLabelText('Animation id').textContent).toBe('1'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete animation' }));
    expect(moveRequestCount(fetchMock)).toBe(1);
    await waitFor(() =>
      expect(screen.getByLabelText('Animation id').textContent).toBe('2'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete animation' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Active commutator part').textContent).toBe(
        'B',
      ),
    );
    expect(moveRequestCount(fetchMock)).toBe(1);
  });
});

function moveRequestCount(
  fetchMock: ReturnType<typeof createFetchMock>,
): number {
  return fetchMock.mock.calls.filter(([input]) =>
    String(input).endsWith('/moves'),
  ).length;
}

async function openAnalysis(): Promise<void> {
  fireEvent.click(await screen.findByRole('tab', { name: 'Analysis' }));
}

function createFetchMock() {
  return vi.fn<typeof fetch>((input, init) => {
    const url = String(input);
    if (url === '/api/cubes' && init?.method === 'POST') {
      return Promise.resolve(jsonResponse({ cubeId: CUBE_ID }, 201));
    }
    if (url === `/api/cubes/${CUBE_ID}`) {
      return Promise.resolve(
        jsonResponse({ cubeId: CUBE_ID, state: INITIAL_STATE }),
      );
    }
    if (url === '/api/commutators') {
      return Promise.resolve(jsonResponse(DEFINITION));
    }
    if (url === `/api/cubes/${CUBE_ID}/moves`) {
      const body = JSON.parse(String(init?.body)) as {
        move?: string;
        moves?: string[];
      };
      const moves = body.moves ?? (body.move === undefined ? [] : [body.move]);
      return Promise.resolve(
        jsonResponse({
          cubeId: CUBE_ID,
          moves,
          states: moves.map(() => MOVED_STATE),
          state: MOVED_STATE,
        }),
      );
    }
    return Promise.resolve(jsonResponse({}, 500));
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function solvedState(): CubeStateResponseDto['state'] {
  return {
    faces: {
      U: Array(9).fill('white'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      B: Array(9).fill('blue'),
    },
  } as unknown as CubeStateResponseDto['state'];
}
