import type { Color, CubeState, Face, FaceState, Move } from './types.js';

type Axis = 'x' | 'y' | 'z';
type Coordinate = -1 | 0 | 1;

interface Vector {
  readonly x: Coordinate;
  readonly y: Coordinate;
  readonly z: Coordinate;
}

interface Sticker {
  readonly color: Color;
  readonly position: Vector;
  readonly normal: Vector;
}

interface FaceDefinition {
  readonly color: Color;
  readonly normal: Vector;
}

interface MoveDefinition {
  readonly axis: Axis;
  readonly layer: Coordinate;
  readonly outwardNormal: Vector;
}

type MoveLayer = Face | 'M' | 'E' | 'S';

const FACE_DEFINITIONS: Readonly<Record<Face, FaceDefinition>> = {
  U: { color: 'white', normal: vector(0, 1, 0) },
  R: { color: 'red', normal: vector(1, 0, 0) },
  F: { color: 'green', normal: vector(0, 0, 1) },
  D: { color: 'yellow', normal: vector(0, -1, 0) },
  L: { color: 'orange', normal: vector(-1, 0, 0) },
  B: { color: 'blue', normal: vector(0, 0, -1) },
};

const MOVE_DEFINITIONS: Readonly<Record<MoveLayer, MoveDefinition>> = {
  U: { axis: 'y', layer: 1, outwardNormal: vector(0, 1, 0) },
  R: { axis: 'x', layer: 1, outwardNormal: vector(1, 0, 0) },
  F: { axis: 'z', layer: 1, outwardNormal: vector(0, 0, 1) },
  D: { axis: 'y', layer: -1, outwardNormal: vector(0, -1, 0) },
  L: { axis: 'x', layer: -1, outwardNormal: vector(-1, 0, 0) },
  B: { axis: 'z', layer: -1, outwardNormal: vector(0, 0, -1) },
  M: { axis: 'x', layer: 0, outwardNormal: vector(-1, 0, 0) },
  E: { axis: 'y', layer: 0, outwardNormal: vector(0, -1, 0) },
  S: { axis: 'z', layer: 0, outwardNormal: vector(0, 0, 1) },
};

const FACE_ORDER: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export class Cube {
  private stickers: Sticker[];

  private constructor(stickers: Sticker[]) {
    this.stickers = stickers;
  }

  static solved(): Cube {
    return new Cube(createSolvedStickers());
  }

  /** 永続化したface stateからCubeを復元する。 */
  static fromState(state: CubeState): Cube {
    const stickers = FACE_ORDER.flatMap((face) => {
      const values = state.faces[face];
      if (!Array.isArray(values) || values.length !== 9) {
        throw new Error(
          `Invalid cube state: face ${face} must have 9 stickers`,
        );
      }
      return values.map((color, index) => ({
        color,
        position: facePosition(face, Math.floor(index / 3), index % 3),
        normal: FACE_DEFINITIONS[face].normal,
      }));
    });
    return new Cube(stickers);
  }

  /** 現在状態を共有参照なしで複製し、非変更の解析に利用できるようにする。 */
  clone(): Cube {
    return new Cube(
      this.stickers.map((sticker) => ({
        color: sticker.color,
        position: { ...sticker.position },
        normal: { ...sticker.normal },
      })),
    );
  }

  reset(): void {
    this.stickers = createSolvedStickers();
  }

  getState(): CubeState {
    return {
      faces: {
        U: this.faceState('U'),
        R: this.faceState('R'),
        F: this.faceState('F'),
        D: this.faceState('D'),
        L: this.faceState('L'),
        B: this.faceState('B'),
      },
    };
  }

  applyMove(move: Move): void {
    const layer = move[0] as MoveLayer;
    const turns = move.endsWith('2') ? 2 : move.endsWith("'") ? 3 : 1;

    for (let turn = 0; turn < turns; turn += 1) {
      this.applyClockwiseQuarterTurn(layer);
    }
  }

  private applyClockwiseQuarterTurn(layer: MoveLayer): void {
    const definition = MOVE_DEFINITIONS[layer];

    this.stickers = this.stickers.map((sticker) => {
      if (sticker.position[definition.axis] !== definition.layer)
        return sticker;

      return {
        color: sticker.color,
        position: rotateClockwise(sticker.position, definition.outwardNormal),
        normal: rotateClockwise(sticker.normal, definition.outwardNormal),
      };
    });
  }

  private faceState(face: Face): FaceState {
    const normal = FACE_DEFINITIONS[face].normal;
    const stickers = this.stickers
      .filter((sticker) => equals(sticker.normal, normal))
      .sort(
        (left, right) =>
          faceIndex(face, left.position) - faceIndex(face, right.position),
      );

    if (stickers.length !== 9) {
      throw new Error(
        `Invalid cube state: face ${face} has ${stickers.length} stickers`,
      );
    }

    return stickers.map((sticker) => sticker.color) as unknown as FaceState;
  }
}

function createSolvedStickers(): Sticker[] {
  return FACE_ORDER.flatMap((face) => {
    const definition = FACE_DEFINITIONS[face];
    const stickers: Sticker[] = [];

    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        stickers.push({
          color: definition.color,
          position: facePosition(face, row, column),
          normal: definition.normal,
        });
      }
    }

    return stickers;
  });
}

function facePosition(face: Face, row: number, column: number): Vector {
  const horizontal = (column - 1) as Coordinate;
  const vertical = (1 - row) as Coordinate;

  switch (face) {
    case 'U':
      return vector(horizontal, 1, -vertical);
    case 'R':
      return vector(1, vertical, -horizontal);
    case 'F':
      return vector(horizontal, vertical, 1);
    case 'D':
      return vector(horizontal, -1, vertical);
    case 'L':
      return vector(-1, vertical, horizontal);
    case 'B':
      return vector(-horizontal, vertical, -1);
  }
}

function faceIndex(face: Face, position: Vector): number {
  let row: number;
  let column: number;

  switch (face) {
    case 'U':
      row = position.z + 1;
      column = position.x + 1;
      break;
    case 'R':
      row = 1 - position.y;
      column = 1 - position.z;
      break;
    case 'F':
      row = 1 - position.y;
      column = position.x + 1;
      break;
    case 'D':
      row = 1 - position.z;
      column = position.x + 1;
      break;
    case 'L':
      row = 1 - position.y;
      column = position.z + 1;
      break;
    case 'B':
      row = 1 - position.y;
      column = 1 - position.x;
      break;
  }

  return row * 3 + column;
}

function rotateClockwise(value: Vector, outwardNormal: Vector): Vector {
  const dot =
    outwardNormal.x * value.x +
    outwardNormal.y * value.y +
    outwardNormal.z * value.z;
  const cross = vector(
    outwardNormal.y * value.z - outwardNormal.z * value.y,
    outwardNormal.z * value.x - outwardNormal.x * value.z,
    outwardNormal.x * value.y - outwardNormal.y * value.x,
  );

  return vector(
    -cross.x + outwardNormal.x * dot,
    -cross.y + outwardNormal.y * dot,
    -cross.z + outwardNormal.z * dot,
  );
}

function equals(left: Vector, right: Vector): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function vector(x: number, y: number, z: number): Vector {
  return { x: asCoordinate(x), y: asCoordinate(y), z: asCoordinate(z) };
}

function asCoordinate(value: number): Coordinate {
  if (value !== -1 && value !== 0 && value !== 1) {
    throw new Error(`Invalid cube coordinate: ${value}`);
  }
  return value;
}
