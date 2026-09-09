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
  AnimationSpeedControl: () => null,
  FaceControlPanel: () => null,
  SliceControlPanel: () => null,
  CubeView: ({ state }: { state: CubeStateResponseDto['state'] }) => (
    <div data-testid="cube-view">{JSON.stringify(state)}</div>
  ),
  MoveSequenceControl: ({
    sequenceInput,
    preparedMoves,
    errorMessage,
    onSequenceInputChange,
    onPrepare,
    onApplyMove,
  }: {
    sequenceInput: string;
    preparedMoves: readonly string[];
    errorMessage?: string;
    onSequenceInputChange: (value: string) => void;
    onPrepare: () => void;
    onApplyMove: (move: string) => void;
  }) => (
    <div>
      <textarea
        aria-label="Sequence"
        value={sequenceInput}
        onChange={(event) => onSequenceInputChange(event.target.value)}
      />
      <button type="button" onClick={onPrepare}>
        Prepare moves
      </button>
      {preparedMoves.map((move, index) => (
        <button
          key={`${index}-${move}`}
          type="button"
          onClick={() => onApplyMove(move)}
        >
          Apply {move}
        </button>
      ))}
      {errorMessage !== undefined && <p role="alert">{errorMessage}</p>}
    </div>
  ),
  PlaybackControls: () => null,
  PresetManager: () => null,
  PresetPanel: () => null,
}));

const CUBE_ID = '00000000-0000-4000-8000-000000000007';
const INITIAL_STATE = cubeState('green');
const MOVED_STATE = cubeState('blue');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Milestone 7 App integration', () => {
  it('M7-IN-01: sequenceをprepareし、選んだ一手を既存Move APIへ送る', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ cubeId: CUBE_ID }, 201))
      .mockResolvedValueOnce(
        jsonResponse({ cubeId: CUBE_ID, state: INITIAL_STATE }),
      )
      .mockResolvedValueOnce(jsonResponse({ moves: ['R', 'U'] }))
      .mockResolvedValueOnce(
        jsonResponse({ cubeId: CUBE_ID, state: MOVED_STATE }),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByTestId('cube-view');

    const sequenceInput = screen.getByLabelText('Sequence');
    fireEvent.keyDown(sequenceInput, { key: 'r' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.change(sequenceInput, {
      target: { value: 'R U' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Prepare moves' }));

    const moveButton = await screen.findByRole('button', { name: 'Apply R' });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching('/api/move-sequences$'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sequence: 'R U' }),
      }),
    );

    fireEvent.click(moveButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.stringMatching(`/api/cubes/${CUBE_ID}/moves$`),
      expect.objectContaining({ body: JSON.stringify({ move: 'R' }) }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('cube-view').textContent).toBe(
        JSON.stringify(MOVED_STATE),
      ),
    );
  });

  it('M7-IN-02: prepare失敗時はMoveを消してerrorを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse({ cubeId: CUBE_ID }, 201))
        .mockResolvedValueOnce(
          jsonResponse({ cubeId: CUBE_ID, state: INITIAL_STATE }),
        )
        .mockResolvedValueOnce(jsonResponse({ error: {} }, 400)),
    );
    render(<App />);
    await screen.findByTestId('cube-view');

    fireEvent.change(screen.getByLabelText('Sequence'), {
      target: { value: 'R X' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare moves' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Could not prepare move sequence.',
    );
    expect(screen.queryByRole('button', { name: /^Apply /u })).toBeNull();
  });
});

function cubeState(frontCenter: 'green' | 'blue') {
  return {
    faces: {
      U: Array(9).fill('white'),
      R: Array(9).fill('red'),
      F: Array(9).fill(frontCenter),
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
