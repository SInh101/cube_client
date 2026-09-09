import type { CubeMove } from '../components/cubeViewModel';

/** Milestone 8で自力実装する再生方向。 */
export type PlaybackDirection = 'forward' | 'reverse';

/** Milestone 8で自力実装する再生状態。 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused';

/**
 * sequence上の位置と再生状態をまとめるためのひな形。
 * 各fieldの更新規則は自力実装する。
 */
export interface PlaybackState {
  readonly moves: readonly CubeMove[];
  readonly currentIndex: number;
  readonly direction: PlaybackDirection;
  readonly status: PlaybackStatus;
  /** 部分再生時だけ設定する、forward方向の排他的終了index。 */
  readonly stopAtIndex?: number;
}
