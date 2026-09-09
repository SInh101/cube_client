import type {
  CubeColorDto,
  CubeStateResponseDto,
} from '@rubiks-learning/api-contract';

export const CUBE_FACE_DIRECTIONS = ['R', 'L', 'U', 'D', 'F', 'B'] as const;

export type CubeFaceDirection = (typeof CUBE_FACE_DIRECTIONS)[number];
export type CubiePosition = readonly [x: number, y: number, z: number];

export interface CubieViewModel {
  readonly id: string;
  readonly position: CubiePosition;
  readonly stickers: Readonly<
    Record<CubeFaceDirection, CubeColorDto | undefined>
  >;
}

export type CubeViewState = CubeStateResponseDto['state'];
export type CubeMove =
  | CubeFaceDirection
  | `${CubeFaceDirection}'`
  | `${CubeFaceDirection}2`
  | CubeSliceDirection
  | `${CubeSliceDirection}'`
  | `${CubeSliceDirection}2`;
export type CubeSliceDirection = 'M' | 'E' | 'S';

export interface CubeMoveAnimation {
  readonly axis: 'x' | 'y' | 'z';
  readonly layer: -1 | 0 | 1;
  readonly angle: number;
}

interface CubeFaceConfig {
  readonly axis: CubeMoveAnimation['axis'];
  readonly layer: CubeMoveAnimation['layer'];
  readonly quarterTurn: number;
}

export const CUBE_FACE_CONFIG: Readonly<
  Record<CubeFaceDirection | CubeSliceDirection, CubeFaceConfig>
> = {
  R: { axis: 'x', layer: 1, quarterTurn: -Math.PI / 2 },
  L: { axis: 'x', layer: -1, quarterTurn: Math.PI / 2 },
  U: { axis: 'y', layer: 1, quarterTurn: -Math.PI / 2 },
  D: { axis: 'y', layer: -1, quarterTurn: Math.PI / 2 },
  F: { axis: 'z', layer: 1, quarterTurn: -Math.PI / 2 },
  B: { axis: 'z', layer: -1, quarterTurn: Math.PI / 2 },
  M: { axis: 'x', layer: 0, quarterTurn: Math.PI / 2 },
  E: { axis: 'y', layer: 0, quarterTurn: Math.PI / 2 },
  S: { axis: 'z', layer: 0, quarterTurn: -Math.PI / 2 },
};

/** APIのface配列を、Three.jsで描画する26個のcubieへ変換する。 */
export function createCubieViewModels(
  state: CubeViewState,
): readonly CubieViewModel[] {
  const cubies: CubieViewModel[] = [];

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue;

        const stickers = {
          R: x === 1 ? state.faces.R[faceIndex(1 - y, 1 - z)] : undefined,
          L: x === -1 ? state.faces.L[faceIndex(1 - y, z + 1)] : undefined,
          U: y === 1 ? state.faces.U[faceIndex(z + 1, x + 1)] : undefined,
          D: y === -1 ? state.faces.D[faceIndex(1 - z, x + 1)] : undefined,
          F: z === 1 ? state.faces.F[faceIndex(1 - y, x + 1)] : undefined,
          B: z === -1 ? state.faces.B[faceIndex(1 - y, 1 - x)] : undefined,
        };
        cubies.push({
          id: Object.values(stickers)
            .filter((color) => color !== undefined)
            .sort()
            .join('-'),
          position: [x, y, z],
          stickers,
        });
      }
    }
  }

  return cubies;
}

/** 2つの表示stateを比較し、位置または向きが変わった現在側のCubie IDを返す。 */
export function findChangedCubieIds(
  before: CubeViewState,
  after: CubeViewState,
): readonly string[] {
  const beforeCubies = createCubieViewModels(before);
  const afterCubies = createCubieViewModels(after);
  const changedIds = new Set<string>();

  for (let index = 0; index < afterCubies.length; index += 1) {
    const previous = beforeCubies[index];
    const current = afterCubies[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      (previous.id !== current.id ||
        CUBE_FACE_DIRECTIONS.some(
          (face) => previous.stickers[face] !== current.stickers[face],
        ))
    ) {
      changedIds.add(current.id);
    }
  }

  return [...changedIds];
}

/** Moveを、回転対象layerとThree.jsの回転軸・角度へ変換する。 */
export function createMoveAnimation(move: CubeMove): CubeMoveAnimation {
  const face = move[0] as CubeFaceDirection | CubeSliceDirection;
  const setting = CUBE_FACE_CONFIG[face];
  const multiplier = move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1;

  return {
    axis: setting.axis,
    layer: setting.layer,
    angle: setting.quarterTurn * multiplier,
  };
}

export function isCubieInMoveLayer(
  position: CubiePosition,
  animation: CubeMoveAnimation,
): boolean {
  const axisIndex = animation.axis === 'x' ? 0 : animation.axis === 'y' ? 1 : 2;
  return position[axisIndex] === animation.layer;
}

/** Ghostを正位置から指定方向へ進め、1周期ごとに正位置へ瞬時に戻す。 */
export function previewRotationAt(
  targetAngle: number,
  elapsedMs: number,
  durationMs = 720,
): number {
  const progress = (elapsedMs % durationMs) / durationMs;
  const outwardProgress = 1 - Math.pow(1 - progress, 3);
  return outwardProgress * targetAngle;
}

function faceIndex(row: number, column: number): number {
  return row * 3 + column;
}
