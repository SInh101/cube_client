// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FaceControlPanel } from './FaceControlPanel';
import type { CubeViewState } from './cubeViewModel';

afterEach(cleanup);

describe('FaceControlPanel', () => {
  it.each(['U', 'D', 'L', 'R', 'F', 'B'])(
    'M6-GUI-01: %s面のCW／CCWを表示する',
    (face) => {
      renderPanel();

      expect(screen.getByLabelText(`${face} face`)).toBeTruthy();
      expect(
        screen.getByRole('button', { name: `${face} clockwise` }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: `${face} counter-clockwise` }),
      ).toBeTruthy();
    },
  );

  it('M6-GUI-02: CW／CCWをSingmaster Moveへ変換する', () => {
    const onMove = vi.fn();
    renderPanel(onMove);

    fireEvent.click(screen.getByRole('button', { name: 'R clockwise' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'R counter-clockwise' }),
    );

    expect(onMove).toHaveBeenNthCalledWith(1, 'R');
    expect(onMove).toHaveBeenNthCalledWith(2, "R'");
  });

  it('M6-GUI-03: GUI hoverだけでpreviewを開始・解除する', () => {
    const onPreviewChange = vi.fn();
    render(
      <FaceControlPanel
        state={SOLVED_STATE}
        onMove={() => undefined}
        onPreviewChange={onPreviewChange}
      />,
    );
    const clockwise = screen.getByRole('button', { name: 'U clockwise' });

    fireEvent.mouseEnter(clockwise);
    fireEvent.mouseLeave(clockwise);

    expect(onPreviewChange).toHaveBeenNthCalledWith(1, {
      face: 'U',
      direction: 'cw',
    });
    expect(onPreviewChange).toHaveBeenNthCalledWith(2, null);
  });

  it('M6-GUI-04: API由来の現在のsticker色をlayerへ表示する', () => {
    const state = {
      ...SOLVED_STATE,
      faces: {
        ...SOLVED_STATE.faces,
        U: ['red', ...SOLVED_STATE.faces.U.slice(1)],
      },
    } as unknown as CubeViewState;
    const { container } = render(
      <FaceControlPanel
        state={state}
        onMove={() => undefined}
        onPreviewChange={() => undefined}
      />,
    );

    const firstUSticker = container.querySelector(
      '[data-face="U"] .face-control__sticker',
    ) as HTMLElement | null;
    expect(firstUSticker?.style.getPropertyValue('--sticker-color')).toBe(
      '#dc2626',
    );
  });
});

function renderPanel(onMove = vi.fn()) {
  return render(
    <FaceControlPanel
      state={SOLVED_STATE}
      onMove={onMove}
      onPreviewChange={() => undefined}
    />,
  );
}

const SOLVED_STATE = {
  faces: {
    U: Array(9).fill('white'),
    R: Array(9).fill('red'),
    F: Array(9).fill('green'),
    D: Array(9).fill('yellow'),
    L: Array(9).fill('orange'),
    B: Array(9).fill('blue'),
  },
} as unknown as CubeViewState;
