// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Cube } from '@rubiks-learning/cube-core';
import type { CubeViewState } from './components/cubeViewModel';
import { permutationParity } from './tutorial/parityQuiz';
import { App } from './App';

vi.mock('./components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./components')>()),
  PresetPanel: () => null,
  CubeView: ({
    state,
    focusedStickers,
    positionMarkers,
  }: {
    state: CubeViewState;
    focusedStickers?: unknown;
    positionMarkers?: readonly unknown[];
  }) => (
    <div>
      <output data-testid="board">{JSON.stringify(state)}</output>
      <output data-testid="focus">
        {JSON.stringify(focusedStickers ?? null)}
      </output>
      <output data-testid="markers">{positionMarkers?.length ?? 0}</output>
    </div>
  ),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const board = () =>
  JSON.parse(screen.getByTestId('board').textContent!) as CubeViewState;
async function openQuiz() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      cubeId: 'parity-test',
      state: Cube.solved().getState(),
    }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Tutorial' }));
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '偶奇判定' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: '偶奇判定' }));
  return fetchMock;
}
describe('Tutorial parity integration', () => {
  it('shows a shuffled fixed board, checks both buttons, resets and blocks turns', async () => {
    const fetchMock = await openQuiz();
    const initial = board();
    expect(permutationParity(initial, 'edge')).toBe('odd');
    expect(initial).not.toEqual(Cube.solved().getState());
    expect(screen.getByTestId('focus').textContent).toBe('null');
    expect(screen.getByTestId('markers').textContent).toBe('0');
    const quiz = screen.getByRole('region', { name: '偶奇判定クイズ' });
    fireEvent.click(within(quiz).getByRole('button', { name: '偶置換' }));
    expect(within(quiz).getByRole('status').textContent).toContain('不正解');
    fireEvent.click(within(quiz).getByRole('button', { name: '奇置換' }));
    expect(within(quiz).getByRole('status').textContent).toContain('正解！');
    expect(board()).toEqual(initial);
    const requests = fetchMock.mock.calls.length;
    fireEvent.keyDown(window, { key: 'R' });
    expect(fetchMock.mock.calls.length).toBe(requests);
    expect(board()).toEqual(initial);
    fireEvent.click(screen.getByRole('button', { name: '固定問題をリセット' }));
    expect(screen.getByText(/正解 0 \/ 回答 0/)).toBeTruthy();
    expect(board()).toEqual(initial);
    fireEvent.click(
      screen.getByRole('button', { name: /コーナー：固定問題 2/ }),
    );
    expect(permutationParity(board(), 'corner')).toBe('even');
    fireEvent.click(screen.getByRole('button', { name: 'エッジ位置' }));
    await waitFor(() => expect(board()).toEqual(Cube.solved().getState()));
    expect(screen.queryByRole('region', { name: '偶奇判定クイズ' })).toBeNull();
  });
  it('reshuffles on correct and incorrect answers and keeps the previous result visible', async () => {
    await openQuiz();
    let seed = 7;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 2 ** 32;
    });
    fireEvent.click(
      screen.getByRole('button', { name: /エッジ：ランダム練習/ }),
    );
    const first = board();
    fireEvent.click(
      screen.getByRole('button', {
        name: permutationParity(first, 'edge') === 'even' ? '偶置換' : '奇置換',
      }),
    );
    const second = board();
    expect(second).not.toEqual(first);
    expect(screen.getByText(/第1問：正解！/)).toBeTruthy();
    expect(screen.getByText(/第2問 · 正解 1 \/ 回答 1/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name:
          permutationParity(second, 'edge') === 'even' ? '奇置換' : '偶置換',
      }),
    );
    expect(board()).not.toEqual(second);
    expect(screen.getByText(/第2問：不正解/)).toBeTruthy();
    expect(screen.getByText(/第3問 · 正解 1 \/ 回答 2/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'ランダム練習をリセット' }),
    );
    expect(screen.getByText(/第1問 · 正解 0 \/ 回答 0/)).toBeTruthy();
    expect(screen.queryByText(/第2問：不正解/)).toBeNull();
  });
});
