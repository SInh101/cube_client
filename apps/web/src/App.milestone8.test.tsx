// @vitest-environment jsdom

import type { CubeStateResponseDto } from '@rubiks-learning/api-contract';
import {
  act,
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
  AnimationSpeedControl: () => null,
  CubeView: ({
    animation,
    onAnimationComplete,
  }: {
    animation?: { id: number };
    onAnimationComplete?: (id: number) => void;
  }) => (
    <button
      type="button"
      aria-label="Complete animation"
      data-animation-id={animation?.id}
      onClick={() => animation && onAnimationComplete?.(animation.id)}
    />
  ),
  FaceControlPanel: ({
    onMove,
    disabled,
  }: {
    onMove: (move: string) => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onMove('R')}>
      R move
    </button>
  ),
  SliceControlPanel: () => null,
  MoveSequenceControl: ({
    disabled,
    onPrepare,
  }: {
    disabled?: boolean;
    onPrepare: () => void;
  }) => (
    <>
      <button type="button" disabled={disabled}>
        Sequence move
      </button>
      <button type="button" disabled={disabled} onClick={onPrepare}>
        Prepare sequence
      </button>
    </>
  ),
  PlaybackControls: ({
    currentIndex,
    moveCount,
    onPlay,
    onPause,
    onNext,
    onPrevious,
    onReversePlay,
    onReset,
  }: {
    currentIndex: number;
    moveCount: number;
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onReversePlay: () => void;
    onReset: () => void;
  }) => (
    <div>
      <output aria-label="Playback position">
        {currentIndex} / {moveCount}
      </output>
      <button type="button" onClick={onPlay}>
        Play
      </button>
      <button type="button" onClick={onPause}>
        Pause
      </button>
      <button type="button" onClick={onNext}>
        Next
      </button>
      <button type="button" onClick={onPrevious}>
        Previous
      </button>
      <button type="button" onClick={onReversePlay}>
        Reverse Play
      </button>
      <button type="button" onClick={onReset}>
        Reset
      </button>
    </div>
  ),
  PresetManager: () => null,
  PresetPanel: ({
    onPlay,
    onReversePlay,
    disabled,
  }: {
    onPlay: (preset: {
      id: string;
      name: string;
      moves: string;
      createdAt: string;
      updatedAt: string;
    }) => void;
    onReversePlay: (preset: {
      id: string;
      name: string;
      moves: string;
      createdAt: string;
      updatedAt: string;
    }) => void;
    disabled?: boolean;
  }) => {
    const preset = {
      id: '00000000-0000-4000-8000-000000000010',
      name: 'Test preset',
      moves: 'R',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPlay(preset)}
        >
          Play preset
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onReversePlay(preset)}
        >
          Reverse preset
        </button>
      </>
    );
  },
}));

const CUBE_ID = '00000000-0000-4000-8000-000000000008';
const STATE = solvedState();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Milestone 8 animation boundary', () => {
  it('Reset完了前の操作を送らず、完了後はreset後のstateから操作する', async () => {
    let resolveReset!: (response: Response) => void;
    const resetResponse = new Promise<Response>((resolve) => {
      resolveReset = resolve;
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID }, 201))
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID, state: STATE }))
      .mockReturnValueOnce(resetResponse)
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID, state: STATE }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    const resetButton = await screen.findByRole('button', {
      name: 'Reset cube',
    });
    const moveButton = screen.getByRole('button', { name: 'R move' });
    fireEvent.click(resetButton);

    await waitFor(() => expect(moveButton).toHaveProperty('disabled', true));
    fireEvent.click(moveButton);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await act(async () =>
      resolveReset(response({ cubeId: CUBE_ID, state: STATE })),
    );
    await waitFor(() => expect(moveButton).toHaveProperty('disabled', false));
    fireEvent.click(moveButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(lastRequestBody(fetchMock)).toEqual({ move: 'R' });
  });

  it('通常のReset cube操作はsequence位置に関係なくReset APIを呼ぶ', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID }, 201))
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID, state: STATE }))
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID, state: STATE }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reset cube' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        `/api/cubes/${CUBE_ID}/reset`,
        { method: 'PUT' },
      ),
    );
  });

  it('M8-AN-01: 実回転中は操作をdisableし、完了通知後に再開する', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID }, 201))
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID, state: STATE }))
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID, state: STATE }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    const moveButton = await screen.findByRole('button', { name: 'R move' });
    const sequenceButton = screen.getByRole('button', {
      name: 'Sequence move',
    });
    fireEvent.click(moveButton);
    await waitFor(() => expect(moveButton).toHaveProperty('disabled', true));
    expect(sequenceButton).toHaveProperty('disabled', true);

    fireEvent.click(moveButton);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await completeAnimation(1);
    await waitFor(() => expect(moveButton).toHaveProperty('disabled', false));
    expect(sequenceButton).toHaveProperty('disabled', false);
  });

  it('M8-PB-01〜06: Playback操作を既存REST境界へ接続する', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID }, 201))
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID, state: STATE }))
      .mockResolvedValueOnce(response({ sequence: 'R U', moves: ['R', 'U'] }))
      .mockImplementation((_, init) => {
        const body =
          typeof init?.body === 'string' ? JSON.parse(init.body) : {};
        const moves = body.moves as string[] | undefined;
        return Promise.resolve(
          response(
            moves === undefined
              ? { cubeId: CUBE_ID, state: STATE }
              : {
                  cubeId: CUBE_ID,
                  moves,
                  states: moves.map(() => STATE),
                  state: STATE,
                },
          ),
        );
      });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await screen.findByRole('button', { name: 'Prepare sequence' });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare sequence' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Playback position').textContent).toContain(
        '0 / 2',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(lastRequestBody(fetchMock)).toEqual({ move: 'R' }),
    );
    await completeAnimation(1);
    await waitFor(() =>
      expect(screen.getByLabelText('Playback position').textContent).toContain(
        '1 / 2',
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'R move' })).toHaveProperty(
        'disabled',
        false,
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() =>
      expect(lastRequestBody(fetchMock)).toEqual({ move: "R'" }),
    );
    await completeAnimation(2);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'R move' })).toHaveProperty(
        'disabled',
        false,
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    await waitFor(() =>
      expect(lastRequestBody(fetchMock)).toEqual({ moves: ['R', 'U'] }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await completeAnimation(3);
    await waitFor(() =>
      expect(screen.getByLabelText('Playback position').textContent).toContain(
        '1 / 2',
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'R move' })).toHaveProperty(
        'disabled',
        false,
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reverse Play' }));
    await waitFor(() =>
      expect(lastRequestBody(fetchMock)).toEqual({ moves: ["U'", "R'"] }),
    );
    await completeAnimation(4);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'R move' })).toHaveProperty(
        'disabled',
        false,
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(lastRequestBody(fetchMock)).toEqual({ move: 'R' }),
    );
    await completeAnimation(5);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        `/api/cubes/${CUBE_ID}/reset`,
        { method: 'PUT' },
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Playback position').textContent).toContain(
        '0 / 2',
      ),
    );
  });

  it('同じPresetを通常・逆方向とも複数回再生できる', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID }, 201))
      .mockResolvedValueOnce(response({ cubeId: CUBE_ID, state: STATE }))
      .mockImplementation((_, init) => {
        const body =
          typeof init?.body === 'string' ? JSON.parse(init.body) : {};
        return Promise.resolve(
          body.sequence === 'R'
            ? response({ sequence: 'R', moves: ['R'] })
            : response({
                cubeId: CUBE_ID,
                moves: body.moves,
                states: Array.isArray(body.moves)
                  ? body.moves.map(() => STATE)
                  : undefined,
                state: STATE,
              }),
        );
      });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await screen.findByRole('button', { name: 'Play preset' });
    await playPresetAndComplete('Play preset', 1, 'R', fetchMock);
    await playPresetAndComplete('Play preset', 2, 'R', fetchMock);
    await playPresetAndComplete('Reverse preset', 3, "R'", fetchMock);
    await playPresetAndComplete('Reverse preset', 4, "R'", fetchMock);
  });
});

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

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function lastRequestBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const body = fetchMock.mock.calls.at(-1)?.[1]?.body;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

async function completeAnimation(animationId: number): Promise<void> {
  const button = screen.getByRole('button', { name: 'Complete animation' });
  await waitFor(() =>
    expect(button.getAttribute('data-animation-id')).toBe(String(animationId)),
  );
  fireEvent.click(button);
}

async function playPresetAndComplete(
  buttonName: string,
  animationId: number,
  expectedMove: string,
  fetchMock: ReturnType<typeof vi.fn>,
): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: buttonName }));
  await waitFor(() =>
    expect(lastRequestBody(fetchMock)).toEqual({ moves: [expectedMove] }),
  );
  await completeAnimation(animationId);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'R move' })).toHaveProperty(
      'disabled',
      false,
    ),
  );
}
