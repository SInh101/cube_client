import { useCallback, useEffect, useRef, useState } from 'react';

import type { CubeMove } from '../components/cubeViewModel';
import type { PlaybackState } from './playbackTypes';

/** Appから再生state machineへ渡す境界。 */
export interface UsePlaybackOptions {
  readonly moves: readonly CubeMove[];
  readonly isAnimating: boolean;
  readonly applyMove: (move: CubeMove) => Promise<void>;
  readonly prepareMoves?: (moves: readonly CubeMove[]) => Promise<void>;
  readonly resetCube: () => Promise<void>;
  readonly sequenceRevision?: number;
}

/** PlaybackControlsとAppが利用する操作境界。 */
export interface UsePlaybackResult {
  readonly state: PlaybackState;
  readonly start: (moves: readonly CubeMove[]) => void;
  readonly play: () => void;
  readonly playUntil: (targetIndex: number) => void;
  readonly pause: () => void;
  readonly next: () => void;
  readonly previous: () => void;
  readonly reversePlay: () => void;
  readonly reset: () => void;
  readonly handleAnimationComplete: (animationId: number) => void;
}

const createInitialState = (moves: readonly CubeMove[]): PlaybackState => ({
  moves,
  currentIndex: 0,
  direction: 'forward',
  status: 'idle',
});

export function usePlayback({
  moves,
  isAnimating,
  applyMove,
  prepareMoves,
  resetCube,
  sequenceRevision = 0,
}: UsePlaybackOptions): UsePlaybackResult {
  const [state, setState] = useState<PlaybackState>(() =>
    createInitialState(moves),
  );
  const pendingTargetIndex = useRef<number | undefined>(undefined);
  const resetRequestPending = useRef(false);
  const appliedSequenceRevision = useRef(sequenceRevision);
  const preparationPending = useRef(false);

  useEffect(() => {
    setState((current) => {
      if (
        appliedSequenceRevision.current === sequenceRevision &&
        haveSameMoves(current.moves, moves)
      )
        return current;
      appliedSequenceRevision.current = sequenceRevision;
      pendingTargetIndex.current = undefined;
      resetRequestPending.current = false;
      return createInitialState(moves);
    });
  }, [moves, sequenceRevision]);

  const sendMove = useCallback(
    async (move: CubeMove, targetIndex: number): Promise<void> => {
      if (
        isAnimating ||
        pendingTargetIndex.current !== undefined ||
        resetRequestPending.current
      ) {
        return;
      }

      pendingTargetIndex.current = targetIndex;
      try {
        await applyMove(move);
      } catch (error: unknown) {
        pendingTargetIndex.current = undefined;
        setState((current) => ({
          ...current,
          status: 'paused',
          stopAtIndex: undefined,
        }));
        void error;
      }
    },
    [applyMove, isAnimating],
  );

  const sendNextMove = useCallback(async (): Promise<void> => {
    const move = state.moves[state.currentIndex];
    if (move === undefined) return;
    await sendMove(move, state.currentIndex + 1);
  }, [sendMove, state.currentIndex, state.moves]);

  const sendPreviousMove = useCallback(async (): Promise<void> => {
    if (state.currentIndex <= 0) return;
    const move = state.moves[state.currentIndex - 1];
    if (move === undefined) return;
    await sendMove(invertMove(move), state.currentIndex - 1);
  }, [sendMove, state.currentIndex, state.moves]);

  useEffect(() => {
    if (state.status !== 'playing') return;
    if (state.direction === 'forward') void sendNextMove();
    else void sendPreviousMove();
  }, [sendNextMove, sendPreviousMove, state.direction, state.status]);

  const prepareThen = useCallback(
    (movesToPrepare: readonly CubeMove[], startPlaying: () => void): void => {
      if (preparationPending.current || movesToPrepare.length === 0) return;
      if (prepareMoves === undefined) {
        startPlaying();
        return;
      }
      preparationPending.current = true;
      void prepareMoves(movesToPrepare)
        .then(startPlaying)
        .catch(() =>
          setState((current) => ({
            ...current,
            status: 'paused',
            stopAtIndex: undefined,
          })),
        )
        .finally(() => {
          preparationPending.current = false;
        });
    },
    [prepareMoves],
  );

  const play = useCallback((): void => {
    if (state.currentIndex >= state.moves.length) return;
    prepareThen(state.moves.slice(state.currentIndex), () =>
      setState((current) => ({
        ...current,
        direction: 'forward',
        status: 'playing',
        stopAtIndex: undefined,
      })),
    );
  }, [prepareThen, state.currentIndex, state.moves]);

  const playUntil = useCallback(
    (targetIndex: number): void => {
      const boundedTarget = Math.min(targetIndex, state.moves.length);
      if (boundedTarget <= state.currentIndex) return;
      prepareThen(state.moves.slice(state.currentIndex, boundedTarget), () =>
        setState((current) => ({
          ...current,
          direction: 'forward',
          status: 'playing',
          stopAtIndex: boundedTarget,
        })),
      );
    },
    [prepareThen, state.currentIndex, state.moves],
  );

  const start = useCallback(
    (nextMoves: readonly CubeMove[]): void => {
      pendingTargetIndex.current = undefined;
      if (nextMoves.length === 0) {
        setState(createInitialState(nextMoves));
        return;
      }
      prepareThen(nextMoves, () =>
        setState({ ...createInitialState(nextMoves), status: 'playing' }),
      );
    },
    [prepareThen],
  );

  const pause = useCallback((): void => {
    setState((current) =>
      current.status === 'playing'
        ? { ...current, status: 'paused', stopAtIndex: undefined }
        : current,
    );
  }, []);

  const next = useCallback((): void => {
    if (state.status === 'playing') return;
    setState((current) => ({
      ...current,
      direction: 'forward',
      stopAtIndex: undefined,
    }));
    void sendNextMove();
  }, [sendNextMove, state.status]);

  const previous = useCallback((): void => {
    if (state.status === 'playing') return;
    setState((current) => ({
      ...current,
      direction: 'reverse',
      stopAtIndex: undefined,
    }));
    void sendPreviousMove();
  }, [sendPreviousMove, state.status]);

  const reversePlay = useCallback((): void => {
    if (state.currentIndex <= 0) return;
    const reverseMoves = state.moves
      .slice(0, state.currentIndex)
      .reverse()
      .map(invertMove);
    prepareThen(reverseMoves, () =>
      setState((current) => ({
        ...current,
        direction: 'reverse',
        status: 'playing',
        stopAtIndex: undefined,
      })),
    );
  }, [prepareThen, state.currentIndex, state.moves]);

  const reset = useCallback((): void => {
    if (
      isAnimating ||
      pendingTargetIndex.current !== undefined ||
      resetRequestPending.current
    ) {
      return;
    }

    resetRequestPending.current = true;
    setState((current) => ({
      ...current,
      status: 'idle',
      stopAtIndex: undefined,
    }));
    void resetCube()
      .then(() => setState((current) => createInitialState(current.moves)))
      .catch(() => setState((current) => ({ ...current, status: 'paused' })))
      .finally(() => {
        resetRequestPending.current = false;
      });
  }, [isAnimating, resetCube]);

  const handleAnimationComplete = useCallback((animationId: number): void => {
    void animationId;
    const targetIndex = pendingTargetIndex.current;
    if (targetIndex === undefined) return;

    pendingTargetIndex.current = undefined;
    setState((current) => {
      const currentIndex = Math.max(
        0,
        Math.min(targetIndex, current.moves.length),
      );
      const reachedBoundary =
        current.direction === 'forward'
          ? currentIndex >= current.moves.length
          : currentIndex <= 0;
      const reachedRequestedStop =
        current.direction === 'forward' &&
        current.stopAtIndex !== undefined &&
        currentIndex >= current.stopAtIndex;
      return {
        ...current,
        currentIndex,
        stopAtIndex: reachedRequestedStop ? undefined : current.stopAtIndex,
        status: reachedBoundary
          ? 'idle'
          : reachedRequestedStop
            ? 'paused'
            : current.status,
      };
    });
  }, []);

  return {
    state,
    start,
    play,
    playUntil,
    pause,
    next,
    previous,
    reversePlay,
    reset,
    handleAnimationComplete,
  };
}

function haveSameMoves(
  left: readonly CubeMove[],
  right: readonly CubeMove[],
): boolean {
  return (
    left.length === right.length &&
    left.every((move, index) => move === right[index])
  );
}

function invertMove(move: CubeMove): CubeMove {
  if (move.endsWith('2')) return move;
  return move.endsWith("'") ? (move[0] as CubeMove) : (`${move}'` as CubeMove);
}
