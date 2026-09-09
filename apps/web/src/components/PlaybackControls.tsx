import type { PlaybackDirection, PlaybackStatus } from '../playback';
import './playback-controls.css';

/** AppまたはusePlaybackから受け取る表示・操作境界。 */
export interface PlaybackControlsProps {
  readonly currentIndex: number;
  readonly moveCount: number;
  readonly status: PlaybackStatus;
  readonly direction: PlaybackDirection;
  readonly disabled?: boolean;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onReversePlay: () => void;
  readonly onReset: () => void;
}

/** Playbackの現在位置と6操作を表示する。 */
export function PlaybackControls({
  currentIndex,
  moveCount,
  status,
  direction,
  disabled = false,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onReversePlay,
  onReset,
}: PlaybackControlsProps) {
  const isPlaying = status === 'playing';
  const atStart = currentIndex <= 0;
  const atEnd = currentIndex >= moveCount;

  return (
    <section className="playback-controls" aria-labelledby="playback-title">
      <div className="playback-controls__summary">
        <h2 id="playback-title">Playback</h2>
        <output aria-label="Playback position">
          {currentIndex} / {moveCount}
        </output>
      </div>
      <p className="playback-controls__status" aria-live="polite">
        {status} · {direction}
      </p>
      <div className="playback-controls__actions">
        <button
          type="button"
          disabled={disabled || isPlaying || atStart}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={disabled || isPlaying || atEnd}
          onClick={onPlay}
        >
          Play
        </button>
        <button type="button" disabled={!isPlaying} onClick={onPause}>
          Pause
        </button>
        <button
          type="button"
          disabled={disabled || isPlaying || atEnd}
          onClick={onNext}
        >
          Next
        </button>
        <button
          type="button"
          disabled={disabled || isPlaying || atStart}
          onClick={onReversePlay}
        >
          Reverse Play
        </button>
        <button
          type="button"
          disabled={disabled || isPlaying || atStart}
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
