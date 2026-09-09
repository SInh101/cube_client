import type { Color, CubeState, Face } from './types.js';

export type CubieKind = 'center' | 'edge' | 'corner';
export type CubieCoordinate = -1 | 0 | 1;
export type CubiePosition = readonly [
  x: CubieCoordinate,
  y: CubieCoordinate,
  z: CubieCoordinate,
];

export interface CubieSnapshot {
  readonly id: string;
  readonly kind: CubieKind;
  readonly position: CubiePosition;
  readonly stickers: Readonly<Partial<Record<Face, Color>>>;
}

export interface CubieChange {
  readonly position: CubiePosition;
  readonly beforeCubieId: string;
  readonly afterCubieId: string;
  readonly kind: CubieKind;
  readonly change: 'permutation' | 'orientation';
}

/** Face配列を位置・piece ID・向きが分かるcubie snapshotへ変換する。 */
export function snapshotCubies(state: CubeState): readonly CubieSnapshot[] {
  const snapshots: CubieSnapshot[] = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue;
        const position = [x, y, z] as CubiePosition;
        const stickers = stickersAt(state, position);
        const colors = Object.values(stickers).sort();
        snapshots.push(
          Object.freeze({
            id: colors.join('-'),
            kind: kindFor(colors.length),
            position,
            stickers: Object.freeze(stickers),
          }),
        );
      }
    }
  }
  return Object.freeze(snapshots);
}

/** 同じ位置のpiece IDまたはsticker向きが変わったcubieを返す。 */
export function analyzeCubieChanges(
  before: CubeState,
  after: CubeState,
): readonly CubieChange[] {
  const beforeCubies = snapshotCubies(before);
  const afterCubies = snapshotCubies(after);

  return beforeCubies.flatMap((beforeCubie, index) => {
    const afterCubie = afterCubies[index];
    if (afterCubie === undefined) return [];
    const permuted = beforeCubie.id !== afterCubie.id;
    if (!permuted && sameStickers(beforeCubie.stickers, afterCubie.stickers)) {
      return [];
    }
    return [
      Object.freeze({
        position: beforeCubie.position,
        beforeCubieId: beforeCubie.id,
        afterCubieId: afterCubie.id,
        kind: afterCubie.kind,
        change: permuted ? 'permutation' : 'orientation',
      } satisfies CubieChange),
    ];
  });
}

function stickersAt(
  state: CubeState,
  [x, y, z]: CubiePosition,
): Partial<Record<Face, Color>> {
  const stickers: Partial<Record<Face, Color>> = {};
  if (x === 1) stickers.R = state.faces.R[(1 - y) * 3 + (1 - z)];
  if (x === -1) stickers.L = state.faces.L[(1 - y) * 3 + (z + 1)];
  if (y === 1) stickers.U = state.faces.U[(z + 1) * 3 + (x + 1)];
  if (y === -1) stickers.D = state.faces.D[(1 - z) * 3 + (x + 1)];
  if (z === 1) stickers.F = state.faces.F[(1 - y) * 3 + (x + 1)];
  if (z === -1) stickers.B = state.faces.B[(1 - y) * 3 + (1 - x)];
  return stickers;
}

function kindFor(stickerCount: number): CubieKind {
  if (stickerCount === 1) return 'center';
  if (stickerCount === 2) return 'edge';
  if (stickerCount === 3) return 'corner';
  throw new Error(`Invalid visible sticker count: ${stickerCount}`);
}

function sameStickers(
  left: CubieSnapshot['stickers'],
  right: CubieSnapshot['stickers'],
): boolean {
  const faces: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  return faces.every((face) => left[face] === right[face]);
}
