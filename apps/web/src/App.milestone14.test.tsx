// @vitest-environment jsdom

import type {
  CubeStateResponseDto,
  SequenceAnalysisResponseDto,
} from '@rubiks-learning/api-contract';
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
  AnimationSpeedControl: () => <div data-testid="animation-speed" />,
  FaceControlPanel: () => <div data-testid="manual-controls" />,
  SliceControlPanel: () => null,
  MoveSequenceControl: () => null,
  PlaybackControls: () => null,
  PresetPanel: () => <div data-testid="preset-panel" />,
  CommutatorTeachingPanel: () => null,
  findChangedCubieIds: () => [],
  CubeView: ({
    animation,
    highlightedCubieIds,
    dimUnhighlighted,
    cubieMarkers,
    stickerMarkers,
    onAnimationComplete,
  }: {
    animation?: { id: number };
    highlightedCubieIds?: readonly string[];
    dimUnhighlighted?: boolean;
    cubieMarkers?: readonly { cubieId: string; label: string }[];
    stickerMarkers?: readonly {
      cubieId: string;
      face: string;
      label: string;
    }[];
    onAnimationComplete?: (id: number) => void;
  }) => (
    <div>
      <output aria-label="Highlighted cubies">
        {highlightedCubieIds?.join(',') ?? ''}
      </output>
      <output aria-label="Dim unhighlighted">{String(dimUnhighlighted)}</output>
      <output aria-label="Cubie markers">
        {cubieMarkers
          ?.map(({ cubieId, label }) => `${cubieId}:${label}`)
          .join(',') ?? ''}
      </output>
      <output aria-label="Animation id">{animation?.id ?? ''}</output>
      <output aria-label="Sticker markers">
        {stickerMarkers
          ?.map(({ cubieId, face, label }) => `${cubieId}:${face}:${label}`)
          .join(',') ?? ''}
      </output>
      <button
        type="button"
        aria-label="Complete animation"
        onClick={() => animation && onAnimationComplete?.(animation.id)}
      />
    </div>
  ),
  CycleTeachingPanel: ({
    result,
    currentIndex,
    playbackDisabled,
    onAnalyze,
    onClear,
    onDisplayModeChange,
    onNext,
    onPrevious,
    onPlay,
    onReversePlay,
  }: {
    result?: SequenceAnalysisResponseDto;
    currentIndex: number;
    playbackDisabled?: boolean;
    onAnalyze: (sequence: string, conjugate: string) => void;
    onClear: () => void;
    onDisplayModeChange: (mode: 'highlight' | 'labels' | 'stickers') => void;
    onNext: () => void;
    onPrevious: () => void;
    onPlay: () => void;
    onReversePlay: () => void;
  }) => (
    <div>
      <output aria-label="Cycle ready">{String(result !== undefined)}</output>
      <output aria-label="Cycle index">{currentIndex}</output>
      <button type="button" onClick={() => onAnalyze('R U F', '')}>
        Analyze sequence
      </button>
      <button type="button" onClick={() => onAnalyze('R U F', 'U')}>
        Analyze conjugated
      </button>
      {result !== undefined && (
        <button type="button" onClick={onClear}>
          Close analysis
        </button>
      )}
      <button type="button" onClick={() => onDisplayModeChange('labels')}>
        Show position labels
      </button>
      <button type="button" onClick={() => onDisplayModeChange('stickers')}>
        Visualize stickers
      </button>
      <button type="button" disabled={playbackDisabled} onClick={onNext}>
        Cycle next
      </button>
      <button type="button" disabled={playbackDisabled} onClick={onPrevious}>
        Cycle previous
      </button>
      <button type="button" disabled={playbackDisabled} onClick={onPlay}>
        Cycle play all
      </button>
      <button type="button" disabled={playbackDisabled} onClick={onReversePlay}>
        Cycle reverse all
      </button>
    </div>
  ),
}));

const CUBE_ID = '00000000-0000-4000-8000-000000000014';
const STATE = solvedState();
const RESULT_STATE = analyzedResultState();
const ANALYSIS: SequenceAnalysisResponseDto = {
  cubeId: CUBE_ID,
  state: STATE,
  sequence: 'R U F',
  moves: ['R', 'U', 'F'],
  resultState: RESULT_STATE,
  analysis: {
    identity: false,
    corners: {
      identity: false,
      permutation: [
        {
          cubieId: 'green-red-white',
          from: [1, 1, 1],
          to: [-1, 1, -1],
          fromLabel: 'URF',
          toLabel: 'ULB',
        },
        {
          cubieId: 'green-orange-yellow',
          from: [-1, -1, 1],
          to: [1, 1, 1],
          fromLabel: 'DLF',
          toLabel: 'URF',
        },
        {
          cubieId: 'blue-orange-white',
          from: [-1, 1, -1],
          to: [-1, -1, 1],
          fromLabel: 'ULB',
          toLabel: 'DLF',
        },
      ],
      cycles: [['DLF', 'URF', 'ULB']],
      threeCycles: [['DLF', 'URF', 'ULB']],
      fixedCubieLabels: [],
      orientationChanges: [],
    },
    edges: {
      identity: true,
      permutation: [],
      cycles: [],
      threeCycles: [],
      fixedCubieLabels: [],
      orientationChanges: [],
    },
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Milestone 14 cycle teaching integration', () => {
  it('Tool mode: 速度を上部に保ち、通常操作と解析教材を分離する', async () => {
    vi.stubGlobal('fetch', createFetchMock());
    render(<App />);
    const practiceTab = await screen.findByRole('tab', { name: 'Practice' });
    const speed = screen.getByTestId('animation-speed');
    expect(speed.compareDocumentPosition(practiceTab)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByTestId('preset-panel')).toBeTruthy();
    expect(screen.queryByLabelText('Cycle ready')).toBeNull();
  });

  it('Tool mode: Analysisでは教材を手動操作盤より上に置く', async () => {
    vi.stubGlobal('fetch', createFetchMock());
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Analysis' }));
    const cyclePanel = screen.getByLabelText('Cycle ready');
    const manualControls = screen.getByTestId('manual-controls');
    expect(cyclePanel.compareDocumentPosition(manualControls)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByTestId('preset-panel')).toBeNull();
  });

  it('M14-UI-01: 対象3 pieceのCubie IDを強調する', async () => {
    await renderAnalyzedApp();
    expect(screen.getByLabelText('Highlighted cubies').textContent).toBe(
      'green-red-white,green-orange-yellow,blue-orange-white',
    );
  });

  it('M14-UI-02: 対象外を薄く表示する', async () => {
    await renderAnalyzedApp();
    expect(screen.getByLabelText('Dim unhighlighted').textContent).toBe('true');
  });

  it('M14-UI-02b: Close analysisで解析表示と3D強調を解除する', async () => {
    await renderAnalyzedApp();
    fireEvent.click(screen.getByRole('button', { name: 'Close analysis' }));
    expect(screen.getByLabelText('Highlighted cubies').textContent).toBe('');
    expect(screen.getByLabelText('Dim unhighlighted').textContent).toBe(
      'false',
    );
    expect(screen.getByLabelText('Cycle ready').textContent).toBe('false');
  });

  it('M14-UI-03: 表示モード選択時だけcycle順を1/2/3 markerとして渡す', async () => {
    await renderAnalyzedApp();
    expect(screen.getByLabelText('Cubie markers').textContent).toBe('');
    fireEvent.click(
      screen.getByRole('button', { name: 'Show position labels' }),
    );
    expect(screen.getByLabelText('Cubie markers').textContent).toBe(
      'green-red-white:1,green-orange-yellow:2,blue-orange-white:3',
    );
  });

  it('M14-UI-03b: ステッカー可視化ボタンで選択pieceの各ステッカーを表示する', async () => {
    await renderAnalyzedApp();
    fireEvent.click(screen.getByRole('button', { name: 'Visualize stickers' }));
    expect(screen.getByLabelText('Sticker markers').textContent).toContain(
      'green-red-white:U:1',
    );
    expect(screen.getByLabelText('Sticker markers').textContent).toContain(
      'green-orange-yellow:L:2',
    );
    expect(screen.getByLabelText('Sticker markers').textContent).toContain(
      'blue-orange-white:U:3',
    );
  });

  it('M14-UI-04: Nextは1手だけ送り、animation完了までstepを進めない', async () => {
    const fetchMock = await renderAnalyzedApp();
    fireEvent.click(screen.getByRole('button', { name: 'Cycle next' }));
    await waitFor(() => expect(moveBodies(fetchMock)).toEqual([{ move: 'R' }]));
    expect(screen.getByLabelText('Cycle index').textContent).toBe('0');
    await completeAnimation(1);
    await waitFor(() =>
      expect(screen.getByLabelText('Cycle index').textContent).toBe('1'),
    );
  });

  it('M14-UI-05: Previousは直前の手の逆手を送り、完了後にstepを戻す', async () => {
    const fetchMock = await renderAnalyzedApp();
    fireEvent.click(screen.getByRole('button', { name: 'Cycle next' }));
    await waitFor(() => expect(moveBodies(fetchMock)).toHaveLength(1));
    await completeAnimation(1);
    await waitFor(() =>
      expect(screen.getByLabelText('Cycle index').textContent).toBe('1'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cycle previous' }));
    await waitFor(() =>
      expect(moveBodies(fetchMock).at(-1)).toEqual({ move: "R'" }),
    );
    await completeAnimation(2);
    await waitFor(() =>
      expect(screen.getByLabelText('Cycle index').textContent).toBe('0'),
    );
  });

  it('M14-UI-06: Play allはanimation完了を待ちながら終端まで再生する', async () => {
    const fetchMock = await renderAnalyzedApp();
    fireEvent.click(screen.getByRole('button', { name: 'Cycle play all' }));
    await completeAllMoves(fetchMock, 3);
    expect(moveBodies(fetchMock)).toEqual([
      { move: 'R' },
      { move: 'U' },
      { move: 'F' },
    ]);
    expect(screen.getByLabelText('Cycle index').textContent).toBe('3');
  });

  it('M14-UI-07: Reverse allは現在位置から逆手を逆順に再生する', async () => {
    const fetchMock = await renderAnalyzedApp();
    fireEvent.click(screen.getByRole('button', { name: 'Cycle play all' }));
    await completeAllMoves(fetchMock, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Cycle reverse all' }));
    await completeAllMoves(fetchMock, 6);
    expect(moveBodies(fetchMock).slice(3)).toEqual([
      { move: "F'" },
      { move: "U'" },
      { move: "R'" },
    ]);
    expect(screen.getByLabelText('Cycle index').textContent).toBe('0');
  });

  it('M14-UI-08: 解析はCubeを変更せず、再生だけがMove APIを使う', async () => {
    const fetchMock = await renderAnalyzedApp();
    expect(moveBodies(fetchMock)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Cycle next' }));
    await waitFor(() => expect(moveBodies(fetchMock)).toHaveLength(1));
  });
  it('共役欄をanalysis APIのconjugateへ渡す', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Analysis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Analyze conjugated' }));
    await waitFor(() =>
      expect(analysisBodies(fetchMock)).toContainEqual({
        sequence: 'R U F',
        conjugate: 'U',
      }),
    );
  });
});

async function renderAnalyzedApp() {
  const fetchMock = createFetchMock();
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Analysis' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Analyze sequence' }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText('Cycle ready').textContent).toBe('true'),
  );
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Cycle next' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  return fetchMock;
}

async function completeAnimation(expectedId: number): Promise<void> {
  await waitFor(() =>
    expect(screen.getByLabelText('Animation id').textContent).toBe(
      String(expectedId),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Complete animation' }));
}

async function completeAllMoves(
  fetchMock: ReturnType<typeof createFetchMock>,
  expectedCount: number,
): Promise<void> {
  const latestBody = moveRequestBodies(fetchMock).at(-1);
  const batchSize = latestBody?.moves?.length ?? 1;
  for (
    let animationId = expectedCount - batchSize + 1;
    animationId <= expectedCount;
    animationId += 1
  ) {
    await completeAnimation(animationId);
  }
  await waitFor(() =>
    expect(moveBodies(fetchMock)).toHaveLength(expectedCount),
  );
}

function moveBodies(
  fetchMock: ReturnType<typeof createFetchMock>,
): { move: string }[] {
  return moveRequestBodies(fetchMock).flatMap((body) =>
    body.moves === undefined
      ? [{ move: body.move as string }]
      : body.moves.map((move) => ({ move })),
  );
}

function moveRequestBodies(
  fetchMock: ReturnType<typeof createFetchMock>,
): { move?: string; moves?: string[] }[] {
  return fetchMock.mock.calls
    .filter(([input]) => String(input).endsWith('/moves'))
    .map(
      ([, init]) =>
        JSON.parse(String(init?.body)) as {
          move?: string;
          moves?: string[];
        },
    );
}

function analysisBodies(
  fetchMock: ReturnType<typeof createFetchMock>,
): { sequence: string; conjugate?: string }[] {
  return fetchMock.mock.calls
    .filter(([input]) => String(input).endsWith('/analyses'))
    .map(
      ([, init]) =>
        JSON.parse(String(init?.body)) as {
          sequence: string;
          conjugate?: string;
        },
    );
}

function createFetchMock() {
  return vi.fn<typeof fetch>((input, init) => {
    const url = String(input);
    if (url === '/api/cubes' && init?.method === 'POST')
      return Promise.resolve(jsonResponse({ cubeId: CUBE_ID }, 201));
    if (url === `/api/cubes/${CUBE_ID}`)
      return Promise.resolve(jsonResponse({ cubeId: CUBE_ID, state: STATE }));
    if (url.endsWith('/analyses'))
      return Promise.resolve(jsonResponse(ANALYSIS));
    if (url.endsWith('/moves')) {
      const body = JSON.parse(String(init?.body)) as {
        move?: string;
        moves?: string[];
      };
      const moves = body.moves ?? (body.move === undefined ? [] : [body.move]);
      return Promise.resolve(
        jsonResponse({
          cubeId: CUBE_ID,
          moves,
          states: moves.map(() => STATE),
          state: STATE,
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

function analyzedResultState(): CubeStateResponseDto['state'] {
  return {
    faces: {
      U: [
        'white',
        'white',
        'white',
        'white',
        'white',
        'white',
        'white',
        'white',
        'orange',
      ],
      R: ['green', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
      F: [
        'green',
        'green',
        'yellow',
        'green',
        'green',
        'green',
        'orange',
        'green',
        'green',
      ],
      D: [
        'blue',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
      ],
      L: [
        'red',
        'orange',
        'orange',
        'orange',
        'orange',
        'orange',
        'orange',
        'orange',
        'white',
      ],
      B: [
        'blue',
        'blue',
        'green',
        'blue',
        'blue',
        'blue',
        'blue',
        'blue',
        'blue',
      ],
    },
  };
}
