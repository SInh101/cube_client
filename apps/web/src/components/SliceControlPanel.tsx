import type { CubeMove, CubeSliceDirection } from './cubeViewModel';

export interface SliceControlPanelProps {
  readonly onMove: (move: CubeMove) => void;
  readonly disabled?: boolean;
}

const SLICES: readonly CubeSliceDirection[] = ['M', 'E', 'S'];

export function SliceControlPanel({
  onMove,
  disabled = false,
}: SliceControlPanelProps) {
  return (
    <section className="slice-control-panel" aria-label="Cube slice controls">
      <h3>Slice moves</h3>
      <div className="slice-control-panel__moves">
        {SLICES.flatMap((slice) =>
          ([slice, `${slice}'`, `${slice}2`] as const).map((move) => (
            <button
              key={move}
              type="button"
              disabled={disabled}
              onClick={() => onMove(move)}
            >
              {move}
            </button>
          )),
        )}
      </div>
    </section>
  );
}
