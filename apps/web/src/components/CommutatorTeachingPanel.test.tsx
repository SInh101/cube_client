// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommutatorTeachingPanel } from './CommutatorTeachingPanel';

const DEFINITION = {
  sequence: "R U R' U'",
  moves: ['R', 'U', "R'", "U'"] as const,
  boundaries: [
    { part: 'A' as const, startIndex: 0, endIndex: 1, moves: ['R'] as const },
    { part: 'B' as const, startIndex: 1, endIndex: 2, moves: ['U'] as const },
    {
      part: 'A_INVERSE' as const,
      startIndex: 2,
      endIndex: 3,
      moves: ["R'"] as const,
    },
    {
      part: 'B_INVERSE' as const,
      startIndex: 3,
      endIndex: 4,
      moves: ["U'"] as const,
    },
  ],
};

afterEach(cleanup);

describe('CommutatorTeachingPanel', () => {
  it('M12-UI-01: [A, B]とA/B/A^-1/B^-1を表示する', () => {
    render(
      <CommutatorTeachingPanel
        definition={DEFINITION}
        activePart="A"
        isLoading={false}
        onPrepare={vi.fn()}
        onPlay={vi.fn()}
        onPlayNextPart={vi.fn()}
      />,
    );

    expect(screen.getByText("[R, U] = R U R' U'")).toBeTruthy();
    expect(
      screen.getByRole('list', { name: 'Commutator parts' }).children,
    ).toHaveLength(4);
    expect(screen.getByText('A⁻¹')).toBeTruthy();
    expect(screen.getByText('B⁻¹')).toBeTruthy();
  });

  it('M12-UI-02: 現在実行中の部分をaria-currentで強調する', () => {
    render(
      <CommutatorTeachingPanel
        definition={DEFINITION}
        activePart="B"
        isLoading={false}
        onPrepare={vi.fn()}
        onPlay={vi.fn()}
        onPlayNextPart={vi.fn()}
      />,
    );

    const parts = screen.getByRole('list', { name: 'Commutator parts' });
    expect(parts.children[1]?.getAttribute('aria-current')).toBe('step');
    expect(parts.children[0]?.hasAttribute('aria-current')).toBe(false);
  });

  it('入力したA/Bをprepare callbackへ渡す', () => {
    const onPrepare = vi.fn();
    render(
      <CommutatorTeachingPanel
        isLoading={false}
        onPrepare={onPrepare}
        onPlay={vi.fn()}
        onPlayNextPart={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('A'), { target: { value: 'R U' } });
    fireEvent.change(screen.getByLabelText('B'), { target: { value: 'F' } });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare commutator' }));
    expect(onPrepare).toHaveBeenCalledWith('R U', 'F');
  });

  it('Play next partから部分再生callbackを呼ぶ', () => {
    const onPlayNextPart = vi.fn();
    render(
      <CommutatorTeachingPanel
        definition={DEFINITION}
        activePart="A"
        isLoading={false}
        onPrepare={vi.fn()}
        onPlay={vi.fn()}
        onPlayNextPart={onPlayNextPart}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play next part' }));
    expect(onPlayNextPart).toHaveBeenCalledOnce();
  });
});
