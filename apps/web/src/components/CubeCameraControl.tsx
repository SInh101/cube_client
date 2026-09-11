import type { CubeCameraView } from './CubeView';
import './cube-camera-control.css';

export interface CubeCameraControlProps {
  readonly value: CubeCameraView;
  readonly disabled?: boolean;
  readonly onChange: (view: CubeCameraView) => void;
}

const VIEWS: readonly CubeCameraView[] = ['UFR', 'UBL', 'DFR', 'DBL'];

export function CubeCameraControl({
  value,
  disabled = false,
  onChange,
}: CubeCameraControlProps) {
  return (
    <div className="cube-camera-control" aria-label="Cube viewpoint">
      <span>View</span>
      {VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          aria-pressed={view === value}
          disabled={disabled}
          onClick={() => onChange(view)}
        >
          {view}
        </button>
      ))}
    </div>
  );
}
