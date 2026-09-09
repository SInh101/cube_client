// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePlayback } from './usePlayback';

describe('usePlayback', () => {
  it('M8-PB-01: Playはanimation完了ごとにsequenceを一手ずつ進める', async () => {
    const applyMove = vi.fn().mockResolvedValue(undefined);
    const resetCube = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePlayback({
        moves: ['R', 'U'],
        isAnimating: false,
        applyMove,
        resetCube,
      }),
    );

    act(() => result.current.play());
    await waitFor(() => expect(applyMove).toHaveBeenCalledWith('R'));
    expect(applyMove).toHaveBeenCalledTimes(1);

    act(() => result.current.handleAnimationComplete(1));
    await waitFor(() => expect(applyMove).toHaveBeenCalledWith('U'));
    expect(applyMove).toHaveBeenCalledTimes(2);

    act(() => result.current.handleAnimationComplete(2));
    expect(result.current.state.currentIndex).toBe(2);
    expect(result.current.state.status).toBe('idle');
  });

  it('M8-PB-03: Nextは一手だけ進め、自動再生を開始しない', async () => {
    const applyMove = vi.fn().mockResolvedValue(undefined);
    const resetCube = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePlayback({
        moves: ['R', 'U'],
        isAnimating: false,
        applyMove,
        resetCube,
      }),
    );

    act(() => result.current.next());
    await waitFor(() => expect(applyMove).toHaveBeenCalledWith('R'));
    act(() => result.current.handleAnimationComplete(1));

    expect(result.current.state.currentIndex).toBe(1);
    expect(result.current.state.status).toBe('idle');
    expect(applyMove).toHaveBeenCalledTimes(1);
  });

  it('M8-PB-02: Pauseは進行中の一手を完了して現在位置で停止する', async () => {
    const applyMove = vi.fn().mockResolvedValue(undefined);
    const resetCube = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePlayback({
        moves: ['R', 'U'],
        isAnimating: false,
        applyMove,
        resetCube,
      }),
    );

    act(() => result.current.play());
    await waitFor(() => expect(applyMove).toHaveBeenCalledTimes(1));
    act(() => result.current.pause());
    act(() => result.current.handleAnimationComplete(1));

    expect(result.current.state.currentIndex).toBe(1);
    expect(result.current.state.status).toBe('paused');
    expect(applyMove).toHaveBeenCalledTimes(1);
  });

  it('M8-PB-04: Previousは直前のMoveのinverseを一手適用する', async () => {
    const applyMove = vi.fn().mockResolvedValue(undefined);
    const resetCube = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePlayback({
        moves: ['R', 'U'],
        isAnimating: false,
        applyMove,
        resetCube,
      }),
    );

    act(() => result.current.next());
    await waitFor(() => expect(applyMove).toHaveBeenCalledWith('R'));
    act(() => result.current.handleAnimationComplete(1));
    act(() => result.current.previous());
    await waitFor(() => expect(applyMove).toHaveBeenLastCalledWith("R'"));
    act(() => result.current.handleAnimationComplete(2));

    expect(result.current.state.currentIndex).toBe(0);
  });

  it('M8-PB-05: Reverse Playは逆順でinverse Moveを適用する', async () => {
    const applyMove = vi.fn().mockResolvedValue(undefined);
    const resetCube = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePlayback({
        moves: ['R', 'U'],
        isAnimating: false,
        applyMove,
        resetCube,
      }),
    );

    act(() => result.current.next());
    await waitFor(() => expect(applyMove).toHaveBeenCalledTimes(1));
    act(() => result.current.handleAnimationComplete(1));
    act(() => result.current.next());
    await waitFor(() => expect(applyMove).toHaveBeenCalledTimes(2));
    act(() => result.current.handleAnimationComplete(2));

    act(() => result.current.reversePlay());
    await waitFor(() => expect(applyMove).toHaveBeenLastCalledWith("U'"));
    act(() => result.current.handleAnimationComplete(3));
    await waitFor(() => expect(applyMove).toHaveBeenLastCalledWith("R'"));
    act(() => result.current.handleAnimationComplete(4));

    expect(result.current.state.currentIndex).toBe(0);
    expect(result.current.state.status).toBe('idle');
  });

  it('M8-PB-06: ResetはCubeをresetして再生位置を先頭へ戻す', async () => {
    const applyMove = vi.fn().mockResolvedValue(undefined);
    const resetCube = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePlayback({
        moves: ['R'],
        isAnimating: false,
        applyMove,
        resetCube,
      }),
    );

    act(() => result.current.next());
    await waitFor(() => expect(applyMove).toHaveBeenCalledTimes(1));
    act(() => result.current.handleAnimationComplete(1));
    act(() => result.current.reset());
    await waitFor(() => expect(resetCube).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.state.currentIndex).toBe(0));

    expect(result.current.state.direction).toBe('forward');
    expect(result.current.state.status).toBe('idle');
  });

  it('同じsequenceでもrevision更新後は先頭から再実行できる', async () => {
    const applyMove = vi.fn().mockResolvedValue(undefined);
    const resetCube = vi.fn().mockResolvedValue(undefined);
    const options = { revision: 0 };
    const { result, rerender } = renderHook(() =>
      usePlayback({
        moves: ['R'],
        sequenceRevision: options.revision,
        isAnimating: false,
        applyMove,
        resetCube,
      }),
    );

    act(() => result.current.play());
    await waitFor(() => expect(applyMove).toHaveBeenCalledTimes(1));
    act(() => result.current.handleAnimationComplete(1));
    expect(result.current.state.currentIndex).toBe(1);

    options.revision += 1;
    rerender();
    await waitFor(() => expect(result.current.state.currentIndex).toBe(0));
    act(() => result.current.play());
    await waitFor(() => expect(applyMove).toHaveBeenCalledTimes(2));
  });

  it('M12-PB-01: playUntilは指定indexまで連続再生して停止する', async () => {
    const applyMove = vi.fn().mockResolvedValue(undefined);
    const resetCube = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePlayback({
        moves: ['R', 'U', 'F'],
        isAnimating: false,
        applyMove,
        resetCube,
      }),
    );

    act(() => result.current.playUntil(2));
    await waitFor(() => expect(applyMove).toHaveBeenLastCalledWith('R'));
    act(() => result.current.handleAnimationComplete(1));
    await waitFor(() => expect(applyMove).toHaveBeenLastCalledWith('U'));
    act(() => result.current.handleAnimationComplete(2));

    expect(result.current.state.currentIndex).toBe(2);
    expect(result.current.state.status).toBe('paused');
    expect(applyMove).toHaveBeenCalledTimes(2);
  });
});
