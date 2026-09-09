// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MoveSequenceControl,
  type MoveSequenceControlProps,
} from './MoveSequenceControl';

afterEach(cleanup);

describe('MoveSequenceControl', () => {
  it('M7-UI-01: sequence入力とprepare操作を表示する', () => {
    const onSequenceInputChange = vi.fn();
    const onPrepare = vi.fn();
    renderControl({ onSequenceInputChange, onPrepare });

    fireEvent.change(screen.getByLabelText('Sequence'), {
      target: { value: 'R U' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare moves' }));

    expect(onSequenceInputChange).toHaveBeenCalledWith('R U');
    expect(onPrepare).toHaveBeenCalledOnce();
  });

  it('M7-UI-02: 検証済みMove一覧を表示する', () => {
    renderControl({ preparedMoves: ['R', 'U', "R'"] });

    expect(screen.getByRole('list', { name: 'Prepared moves' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Apply move 2: U' }),
    ).toBeTruthy();
  });

  it('M7-UI-03: 選択した一手をonApplyMoveへ渡す', () => {
    const onApplyMove = vi.fn();
    renderControl({ preparedMoves: ['R', "U'"], onApplyMove });

    fireEvent.click(screen.getByRole('button', { name: "Apply move 2: U'" }));
    expect(onApplyMove).toHaveBeenCalledExactlyOnceWith("U'");
  });

  it('M7-UI-04: loadingとerrorを表示する', () => {
    renderControl({ isLoading: true, errorMessage: 'Invalid sequence' });

    expect(screen.getByRole('button', { name: 'Preparing…' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('alert').textContent).toBe('Invalid sequence');
  });

  it('M8-AN-02: 実回転中のdisabledを入力と操作へ反映する', () => {
    renderControl({ preparedMoves: ['R'], disabled: true });

    expect(screen.getByLabelText('Sequence')).toHaveProperty('disabled', true);
    expect(
      screen.getByRole('button', { name: 'Prepare moves' }),
    ).toHaveProperty('disabled', true);
    expect(
      screen.getByRole('button', { name: 'Apply move 1: R' }),
    ).toHaveProperty('disabled', true);
  });
});

function renderControl(
  overrides: Partial<MoveSequenceControlProps> = {},
): void {
  render(
    <MoveSequenceControl
      sequenceInput=""
      preparedMoves={[]}
      isLoading={false}
      onSequenceInputChange={() => undefined}
      onPrepare={() => undefined}
      onApplyMove={() => undefined}
      {...overrides}
    />,
  );
}
