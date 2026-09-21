// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Cube, type CubeState, type Move } from '@rubiks-learning/cube-core';
import { App } from './App';

vi.mock('./components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./components')>()),
  PresetPanel: () => null,
  CubeView: ({
    state,
    animation,
    onAnimationComplete,
  }: {
    state: CubeState;
    animation?: { id: number };
    onAnimationComplete: (id: number) => void;
  }) => (
    <div>
      <output data-testid="board">{JSON.stringify(state)}</output>
      <button onClick={() => animation && onAnimationComplete(animation.id)}>
        Complete animation
      </button>
    </div>
  ),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('resets before scrambling and displays a sequence reproducible from solved', async () => {
  const cube = Cube.solved();
  const batches: Move[][] = [];
  const actions: string[] = [];
  vi.spyOn(Math, 'random').mockReturnValue(0.3);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/move-sequences')
        return { ok: true, json: async () => ({ moves: ['R', 'U', 'F'] }) };
      if (url.endsWith('/reset')) {
        expect(init?.method).toBe('PUT');
        actions.push('reset');
        cube.reset();
        return {
          ok: true,
          json: async () => ({ cubeId: 'bld-test', state: cube.getState() }),
        };
      }
      if (url.endsWith('/moves')) {
        actions.push('moves');
        const { moves } = JSON.parse(init!.body as string) as { moves: Move[] };
        batches.push(moves);
        const states = moves.map((move) => {
          cube.applyMove(move);
          return cube.getState();
        });
        return {
          ok: true,
          json: async () => ({
            cubeId: 'bld-test',
            states,
            state: cube.getState(),
            moves,
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ cubeId: 'bld-test', state: cube.getState() }),
      };
    }),
  );
  render(<App />);
  fireEvent.change(await screen.findByLabelText('Sequence'), {
    target: { value: 'R U F' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Prepare moves' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Playback position').textContent).toBe(
      '0 / 3',
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  const visible = Cube.solved();
  visible.applyMove('R');
  await waitFor(() =>
    expect(JSON.parse(screen.getByTestId('board').textContent!)).toEqual(
      visible.getState(),
    ),
  );
  fireEvent.click(screen.getByRole('tab', { name: '3BLD' }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete animation' }));
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'ランダムスクランブル',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: 'ランダムスクランブル' }));
  await waitFor(() => expect(batches).toHaveLength(2));
  expect(actions).toEqual(['moves', 'reset', 'moves']);
  const randomMoves = batches[1]!;
  expect(randomMoves).toHaveLength(25);
  visible.reset();
  randomMoves.forEach((move) => visible.applyMove(move));
  await waitFor(() =>
    expect(JSON.parse(screen.getByTestId('board').textContent!)).toEqual(
      visible.getState(),
    ),
  );
  expect(
    screen.getByRole('region', { name: 'スクランブル手順' }).textContent,
  ).toContain(randomMoves.join(' '));
  fireEvent.click(screen.getByRole('button', { name: 'ランダムスクランブル' }));
  await waitFor(() => expect(batches).toHaveLength(3));
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'ランダムスクランブル',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  expect(actions).toEqual(['moves', 'reset', 'moves', 'reset', 'moves']);
  expect(JSON.parse(screen.getByTestId('board').textContent!)).toEqual(
    visible.getState(),
  );
  fireEvent.click(screen.getByRole('button', { name: '分析' }));
  expect(screen.getByRole('region', { name: 'エッジ分析結果' })).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Practice' }));
  expect(screen.getByLabelText('Playback position').textContent).toBe('0 / 0');
});

it.each(['reset', 'moves'])(
  'handles failure at the %s step without showing a successful scramble',
  async (failedStep) => {
    const cube = Cube.solved();
    cube.applyMove('R');
    const initialState = cube.getState();
    const actions: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/reset')) {
          actions.push('reset');
          if (failedStep === 'reset') return { ok: false };
          cube.reset();
        }
        if (url.endsWith('/moves')) {
          actions.push('moves');
          return { ok: false };
        }
        return {
          ok: true,
          json: async () => ({ cubeId: 'bld-test', state: cube.getState() }),
        };
      }),
    );
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: '3BLD' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'ランダムスクランブル' }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'スクランブルに失敗',
    );
    expect(actions).toEqual(
      failedStep === 'reset' ? ['reset'] : ['reset', 'moves'],
    );
    expect(JSON.parse(screen.getByTestId('board').textContent!)).toEqual(
      failedStep === 'reset' ? initialState : Cube.solved().getState(),
    );
    expect(
      screen.queryByRole('region', { name: 'スクランブル手順' }),
    ).toBeNull();
  },
);
