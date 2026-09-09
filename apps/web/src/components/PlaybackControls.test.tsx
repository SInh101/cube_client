// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaybackControls } from './PlaybackControls';

afterEach(cleanup);

describe('PlaybackControls', () => {
  it('現在位置と状態を表示し、利用可能な操作を通知する', () => {
    const handlers = createHandlers();
    render(
      <PlaybackControls
        currentIndex={1}
        moveCount={3}
        status="paused"
        direction="forward"
        {...handlers}
      />,
    );

    expect(screen.getByLabelText('Playback position').textContent).toContain(
      '1 / 3',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(handlers.onNext).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('animation中もPauseだけは操作できる', () => {
    const handlers = createHandlers();
    render(
      <PlaybackControls
        currentIndex={1}
        moveCount={3}
        status="playing"
        direction="forward"
        disabled
        {...handlers}
      />,
    );

    expect(screen.getByRole('button', { name: 'Play' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveProperty(
      'disabled',
      false,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(handlers.onPause).toHaveBeenCalledOnce();
  });
});

function createHandlers() {
  return {
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onReversePlay: vi.fn(),
    onReset: vi.fn(),
  };
}
