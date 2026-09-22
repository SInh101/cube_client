import type { CubeColorDto } from '@rubiks-learning/api-contract';
import { useCubeColorScheme } from './CubeColorSchemeContext';
import {
  COLOR_NAMES,
  CUBE_COLORS,
  DEFAULT_ORIENTATION,
  frontColors,
  STICKER_COLORS,
} from './cubeColorScheme';
import './cube-orientation-control.css';

export function CubeOrientationControl({
  disabled = false,
}: {
  readonly disabled?: boolean;
}) {
  const { orientation, colorMap, setOrientation, storageError } =
    useCubeColorScheme();
  const fronts = frontColors(orientation.up);
  return (
    <fieldset className="cube-orientation-control" disabled={disabled}>
      <legend>基準の配色（全タブ共通）</legend>
      <div className="cube-orientation-selects">
        <label>
          U面の色
          <select
            value={orientation.up}
            onChange={(event) => {
              const up = event.target.value as CubeColorDto;
              const candidates = frontColors(up);
              setOrientation({
                up,
                front: candidates.includes(orientation.front)
                  ? orientation.front
                  : candidates[0]!,
              });
            }}
          >
            {CUBE_COLORS.map((color) => (
              <option key={color} value={color}>
                {COLOR_NAMES[color]}
              </option>
            ))}
          </select>
        </label>
        <label>
          F面の色
          <select
            value={orientation.front}
            onChange={(event) =>
              setOrientation({
                ...orientation,
                front: event.target.value as CubeColorDto,
              })
            }
          >
            {fronts.map((color) => (
              <option key={color} value={color}>
                {COLOR_NAMES[color]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setOrientation(DEFAULT_ORIENTATION)}
        >
          標準の配色に戻す
        </button>
      </div>
      <div className="cube-orientation-preview" aria-label="完成状態の配色">
        {(
          [
            ['U', 'white'],
            ['F', 'green'],
            ['R', 'red'],
            ['D', 'yellow'],
            ['B', 'blue'],
            ['L', 'orange'],
          ] as const
        ).map(([face, logical]) => (
          <span key={face}>
            <i
              aria-hidden="true"
              style={{ backgroundColor: STICKER_COLORS[colorMap[logical]] }}
            />
            {face}: {COLOR_NAMES[colorMap[logical]]}
          </span>
        ))}
      </div>
      <p>
        完成状態でU面・F面に置く色を選びます。F面にはU面と隣り合う色を選べます。
      </p>
      {storageError && <p role="status">{storageError}</p>}
    </fieldset>
  );
}
