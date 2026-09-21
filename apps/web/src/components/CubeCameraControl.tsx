import type { CubeCameraView } from './CubeView';
import './cube-camera-control.css';

export interface CubeCameraControlProps {
  readonly value: CubeCameraView;
  readonly freeCamera: boolean;
  readonly onFreeCameraChange: (enabled: boolean) => void;
  readonly disabled?: boolean;
  readonly onChange: (view: CubeCameraView) => void;
}

const VIEWS: readonly CubeCameraView[] = ['UFR', 'UBL', 'DFR', 'DBL'];

export function CubeCameraControl({
  value,
  freeCamera,
  onFreeCameraChange,
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
          aria-pressed={!freeCamera && view === value}
          disabled={disabled}
          onClick={() => onChange(view)}
        >
          {view}
        </button>
      ))}
      <button
        className="free-camera-toggle"
        type="button"
        aria-pressed={freeCamera}
        disabled={disabled}
        onClick={() => onFreeCameraChange(!freeCamera)}
      >
        フリーカメラ {freeCamera ? 'ON' : 'OFF'}
      </button>
      <p className="free-camera-help">
        {freeCamera
          ? 'ドラッグで視点を回転、ホイール・ピンチで拡大縮小。キューブの状態や手数は変わりません。'
          : 'フリーカメラをオンにすると自由に視点を変えられます。オフにすると選択中の固定視点に戻ります。'}
      </p>
    </div>
  );
}
