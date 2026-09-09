import type { CSSProperties } from 'react';
import type { CubeColorDto, FaceStateDto } from '@rubiks-learning/api-contract';

import type { CubeFaceDirection, CubeMove } from './cubeViewModel';

export type PreviewDirection = 'cw' | 'ccw';

export interface FacePreview {
  readonly face: CubeFaceDirection;
  readonly direction: PreviewDirection;
}

export interface FaceControlProps {
  readonly face: CubeFaceDirection;
  readonly colors: FaceStateDto;
  readonly onMove: (move: CubeMove) => void;
  readonly onPreviewChange: (preview: FacePreview | null) => void;
  readonly disabled?: boolean;
}

const STICKER_COLORS: Record<CubeColorDto, string> = {
  white: '#f8fafc',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#facc15',
  orange: '#f97316',
  blue: '#2563eb',
};

export function FaceControl({
  face,
  colors,
  onMove,
  onPreviewChange,
  disabled = false,
}: FaceControlProps) {
  const preview = (direction: PreviewDirection) =>
    onPreviewChange({ face, direction });

  return (
    <section
      className="face-control"
      data-face={face}
      aria-label={`${face} face`}
    >
      <button
        type="button"
        disabled={disabled}
        className="face-control__turn"
        aria-label={`${face} counter-clockwise`}
        onClick={() => {
          onPreviewChange(null);
          onMove(`${face}'`);
        }}
        onMouseEnter={() => preview('ccw')}
        onMouseLeave={() => onPreviewChange(null)}
        onFocus={() => preview('ccw')}
        onBlur={() => onPreviewChange(null)}
      >
        ↺
      </button>
      <div className="face-control__layer" aria-hidden="true">
        {colors.map((color, index) => (
          <span
            key={index}
            className="face-control__sticker"
            style={
              { '--sticker-color': STICKER_COLORS[color] } as CSSProperties
            }
          >
            {index === 4 ? face : ''}
          </span>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        className="face-control__turn"
        aria-label={`${face} clockwise`}
        onClick={() => {
          onPreviewChange(null);
          onMove(face);
        }}
        onMouseEnter={() => preview('cw')}
        onMouseLeave={() => onPreviewChange(null)}
        onFocus={() => preview('cw')}
        onBlur={() => onPreviewChange(null)}
      >
        ↻
      </button>
    </section>
  );
}
