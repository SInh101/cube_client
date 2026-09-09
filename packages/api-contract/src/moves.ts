export type MoveDto =
  | 'R'
  | "R'"
  | 'R2'
  | 'L'
  | "L'"
  | 'L2'
  | 'U'
  | "U'"
  | 'U2'
  | 'D'
  | "D'"
  | 'D2'
  | 'F'
  | "F'"
  | 'F2'
  | 'B'
  | "B'"
  | 'B2'
  | 'M'
  | "M'"
  | 'M2'
  | 'E'
  | "E'"
  | 'E2'
  | 'S'
  | "S'"
  | 'S2';

export interface MoveRequestDto {
  readonly move: MoveDto;
}

export interface MoveBatchRequestDto {
  readonly moves: readonly MoveDto[];
}

export interface MoveBatchResponseDto {
  readonly cubeId: string;
  readonly moves: readonly MoveDto[];
  /** 各indexのmoveを適用した直後の状態。同じindexのアニメーションに使う。 */
  readonly states: readonly import('./cubes.js').CubeStateResponseDto['state'][];
  readonly state: import('./cubes.js').CubeStateResponseDto['state'];
}
