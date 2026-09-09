export const MIN_ANIMATION_DURATION_MS = 50;
export const MAX_ANIMATION_DURATION_MS = 2000;
export const ANIMATION_DURATION_STEP_MS = 10;
export const DEFAULT_ANIMATION_DURATION_MS = 240;

export interface AnimationSpeedControlProps {
  readonly value: number;
  readonly onChange: (durationMs: number) => void;
}

export function AnimationSpeedControl({
  value,
  onChange,
}: AnimationSpeedControlProps) {
  const updateDuration = (rawValue: string) => {
    const duration = Number(rawValue);
    if (!Number.isFinite(duration)) return;
    onChange(
      Math.min(
        MAX_ANIMATION_DURATION_MS,
        Math.max(MIN_ANIMATION_DURATION_MS, duration),
      ),
    );
  };

  return (
    <fieldset className="animation-speed-control">
      <legend>Animation duration</legend>
      <label className="animation-speed-control__slider">
        <span aria-hidden="true">Fast</span>
        <input
          aria-label="Animation duration slider"
          type="range"
          min={MIN_ANIMATION_DURATION_MS}
          max={MAX_ANIMATION_DURATION_MS}
          step={ANIMATION_DURATION_STEP_MS}
          value={value}
          onChange={(event) => updateDuration(event.target.value)}
        />
        <span aria-hidden="true">Slow</span>
      </label>
      <label className="animation-speed-control__number">
        <input
          aria-label="Animation duration in milliseconds"
          type="number"
          min={MIN_ANIMATION_DURATION_MS}
          max={MAX_ANIMATION_DURATION_MS}
          step={ANIMATION_DURATION_STEP_MS}
          value={value}
          onChange={(event) => updateDuration(event.target.value)}
        />
        <span>ms</span>
      </label>
    </fieldset>
  );
}
