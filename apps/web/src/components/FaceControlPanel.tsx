import { FaceControl, type FacePreview } from './FaceControl';
import type {
  CubeFaceDirection,
  CubeMove,
  CubeViewState,
} from './cubeViewModel';

export interface FaceControlPanelProps {
  readonly state: CubeViewState;
  readonly onMove: (move: CubeMove) => void;
  readonly onPreviewChange: (preview: FacePreview | null) => void;
  readonly disabled?: boolean;
}

const PANEL_FACES: readonly CubeFaceDirection[] = [
  'U',
  'L',
  'F',
  'R',
  'B',
  'D',
];

export function FaceControlPanel({
  state,
  onMove,
  onPreviewChange,
  disabled = false,
}: FaceControlPanelProps) {
  return (
    <div className="face-control-panel" aria-label="Cube face controls">
      {PANEL_FACES.map((face) => (
        <FaceControl
          key={face}
          face={face}
          colors={state.faces[face]}
          onMove={onMove}
          onPreviewChange={onPreviewChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
