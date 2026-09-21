// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Cube } from '@rubiks-learning/cube-core';
import { BlindfoldPanel } from './BlindfoldPanel';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
const props = () => ({
  state: Cube.solved().getState(),
  disabled: false,
  onScramble: vi.fn(async () => 'R U'),
});
it('edits and persists 48 labels and selects a buffer by click or text', () => {
  const p = props();
  const view = render(<BlindfoldPanel {...p} />);
  expect(screen.getAllByRole('textbox')).toHaveLength(50);
  fireEvent.change(screen.getByLabelText('UFの文字'), {
    target: { value: 'う' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'BUをバッファに設定' }));
  expect(
    (screen.getByLabelText('エッジバッファ') as HTMLInputElement).value,
  ).toBe('BU');
  fireEvent.change(screen.getByLabelText('コーナーバッファ'), {
    target: { value: 'FRU' },
  });
  view.unmount();
  render(<BlindfoldPanel {...p} />);
  expect((screen.getByLabelText('UFの文字') as HTMLInputElement).value).toBe(
    'う',
  );
  expect(
    screen
      .getByRole('button', { name: 'FRUをバッファに設定' })
      .getAttribute('aria-pressed'),
  ).toBe('true');
});
it('keeps answers hidden during practice and invalidates results when state changes', () => {
  const p = props();
  const view = render(<BlindfoldPanel {...p} />);
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'practice' },
  });
  expect(screen.queryByRole('region', { name: 'エッジ分析結果' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'メモを判定' }));
  expect(screen.getByRole('status').textContent).toContain(
    '正解（配置が完成）',
  );
  fireEvent.click(screen.getByRole('button', { name: '分析結果を見る' }));
  expect(
    within(screen.getByRole('region', { name: 'エッジ分析結果' })).getByText(
      '（交換なし）',
    ),
  ).toBeTruthy();
  const cube = Cube.solved();
  cube.applyMove('R');
  view.rerender(<BlindfoldPanel {...p} state={cube.getState()} />);
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('region', { name: 'エッジ分析結果' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'メモを判定' }));
  expect(screen.getByRole('status').textContent).toContain('未完成');
});
it('shows validation errors and recovers from scramble failure', async () => {
  const p = {
    ...props(),
    onScramble: vi.fn().mockRejectedValue(new Error('failed')),
  };
  render(<BlindfoldPanel {...p} />);
  fireEvent.change(screen.getByLabelText('UFの文字'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: '分析' }));
  expect(screen.getByRole('alert').textContent).toContain('全ステッカー');
  fireEvent.click(screen.getByRole('button', { name: 'ランダムスクランブル' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain(
      'スクランブルに失敗',
    ),
  );
  expect(
    (
      screen.getByRole('button', {
        name: 'ランダムスクランブル',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
