import {
  snapshotCubies,
  type CubieKind,
  type CubiePosition,
  type CubieSnapshot,
} from './CubieAnalysis.js';
import type { Color, CubeState, Face } from './types.js';

export interface PermutationEntry {
  readonly cubieId: string;
  readonly kind: CubieKind;
  readonly from: CubiePosition;
  readonly to: CubiePosition;
  readonly fromLabel: string;
  readonly toLabel: string;
}

export interface OrientationChange extends PermutationEntry {
  readonly delta: 1 | 2;
}

export interface PermutationAnalysis {
  readonly permutation: readonly PermutationEntry[];
  readonly cycles: readonly (readonly string[])[];
  readonly threeCycles: readonly (readonly [string, string, string])[];
  readonly fixedCubieIds: readonly string[];
  readonly orientationChanges: readonly OrientationChange[];
}

/** 2つの合法CubeState間のpermutation、cycle、orientation差分を解析する。 */
export function analyzePermutation(
  before: CubeState,
  after: CubeState,
): PermutationAnalysis {
  const beforeCubies = snapshotCubies(before);
  const afterCubies = snapshotCubies(after);
  const afterById = new Map(afterCubies.map((cubie) => [cubie.id, cubie]));
  const beforeByPosition = new Map(
    beforeCubies.map((cubie) => [positionKey(cubie.position), cubie]),
  );

  const permutation = beforeCubies.map((beforeCubie) => {
    const afterCubie = afterById.get(beforeCubie.id);
    if (afterCubie === undefined) {
      throw new Error(`Cubie is missing from after state: ${beforeCubie.id}`);
    }
    return Object.freeze({
      cubieId: beforeCubie.id,
      kind: beforeCubie.kind,
      from: beforeCubie.position,
      to: afterCubie.position,
      fromLabel: cubiePositionLabel(beforeCubie.position),
      toLabel: cubiePositionLabel(afterCubie.position),
    });
  });

  const moved = permutation.filter(
    (entry) => !samePosition(entry.from, entry.to),
  );
  const nextById = new Map<string, string>();
  for (const entry of moved) {
    const destination = beforeByPosition.get(positionKey(entry.to));
    if (destination === undefined) {
      throw new Error(`Invalid destination position: ${positionKey(entry.to)}`);
    }
    nextById.set(entry.cubieId, destination.id);
  }
  const cycles = decomposeCycles(nextById);
  const threeCycles = cycles.filter(
    (cycle): cycle is readonly [string, string, string] => cycle.length === 3,
  );

  const orientationChanges = permutation.flatMap((entry) => {
    const beforeCubie = beforeCubies.find(({ id }) => id === entry.cubieId);
    const afterCubie = afterById.get(entry.cubieId);
    if (beforeCubie === undefined || afterCubie === undefined) return [];
    const modulus = entry.kind === 'corner' ? 3 : entry.kind === 'edge' ? 2 : 1;
    const delta =
      (orientationOf(afterCubie) - orientationOf(beforeCubie) + modulus) %
      modulus;
    return delta === 0
      ? []
      : [Object.freeze({ ...entry, delta: delta as 1 | 2 })];
  });

  return Object.freeze({
    permutation: Object.freeze(permutation),
    cycles: Object.freeze(cycles),
    threeCycles: Object.freeze(threeCycles),
    fixedCubieIds: Object.freeze(
      permutation
        .filter((entry) => samePosition(entry.from, entry.to))
        .map(({ cubieId }) => cubieId),
    ),
    orientationChanges: Object.freeze(orientationChanges),
  });
}

/** 座標をSingmasterで読みやすい固定position名へ変換する。 */
export function cubiePositionLabel([x, y, z]: CubiePosition): string {
  if (y === 1 && x === 1 && z === 1) return 'URF';
  if (y === 1 && x === -1 && z === 1) return 'UFL';
  if (y === 1 && x === -1 && z === -1) return 'ULB';
  if (y === 1 && x === 1 && z === -1) return 'UBR';
  if (y === -1 && x === 1 && z === 1) return 'DFR';
  if (y === -1 && x === -1 && z === 1) return 'DLF';
  if (y === -1 && x === -1 && z === -1) return 'DBL';
  if (y === -1 && x === 1 && z === -1) return 'DRB';

  const faces: string[] = [];
  if (y === 1) faces.push('U');
  if (y === -1) faces.push('D');
  if (z === 1) faces.push('F');
  if (z === -1) faces.push('B');
  if (x === 1) faces.push('R');
  if (x === -1) faces.push('L');
  return faces.join('');
}

function decomposeCycles(
  nextById: ReadonlyMap<string, string>,
): readonly (readonly string[])[] {
  const visited = new Set<string>();
  const cycles: string[][] = [];
  for (const start of nextById.keys()) {
    if (visited.has(start)) continue;
    const cycle: string[] = [];
    let current = start;
    while (!visited.has(current)) {
      visited.add(current);
      cycle.push(current);
      const next = nextById.get(current);
      if (next === undefined)
        throw new Error(`Broken permutation at ${current}`);
      current = next;
    }
    cycles.push(Object.freeze(cycle) as string[]);
  }
  return Object.freeze(cycles);
}

function orientationOf(cubie: CubieSnapshot): number {
  if (cubie.kind === 'center') return 0;
  const entries = Object.entries(cubie.stickers) as [Face, Color][];
  const primarySticker =
    entries.find(([, color]) => color === 'white' || color === 'yellow') ??
    entries.find(([, color]) => color === 'green' || color === 'blue');
  if (primarySticker === undefined) {
    throw new Error(`Cubie has no orientation reference: ${cubie.id}`);
  }
  const orientation = orderedFaces(cubie.position).indexOf(primarySticker[0]);
  if (orientation < 0) throw new Error(`Invalid sticker face: ${cubie.id}`);
  return orientation;
}

function orderedFaces([x, y, z]: CubiePosition): readonly Face[] {
  if (y === 1) {
    if (x === 1 && z === 1) return ['U', 'R', 'F'];
    if (x === -1 && z === 1) return ['U', 'F', 'L'];
    if (x === -1 && z === -1) return ['U', 'L', 'B'];
    if (x === 1 && z === -1) return ['U', 'B', 'R'];
    if (x === 1) return ['U', 'R'];
    if (x === -1) return ['U', 'L'];
    if (z === 1) return ['U', 'F'];
    if (z === -1) return ['U', 'B'];
    return ['U'];
  }
  if (y === -1) {
    if (x === 1 && z === 1) return ['D', 'F', 'R'];
    if (x === -1 && z === 1) return ['D', 'L', 'F'];
    if (x === -1 && z === -1) return ['D', 'B', 'L'];
    if (x === 1 && z === -1) return ['D', 'R', 'B'];
    if (x === 1) return ['D', 'R'];
    if (x === -1) return ['D', 'L'];
    if (z === 1) return ['D', 'F'];
    if (z === -1) return ['D', 'B'];
    return ['D'];
  }
  if (z === 1 && x === 1) return ['F', 'R'];
  if (z === 1 && x === -1) return ['F', 'L'];
  if (z === -1 && x === -1) return ['B', 'L'];
  if (z === -1 && x === 1) return ['B', 'R'];
  if (x === 1) return ['R'];
  if (x === -1) return ['L'];
  if (z === 1) return ['F'];
  return ['B'];
}

function positionKey(position: CubiePosition): string {
  return position.join(',');
}

function samePosition(left: CubiePosition, right: CubiePosition): boolean {
  return left.every((coordinate, index) => coordinate === right[index]);
}
