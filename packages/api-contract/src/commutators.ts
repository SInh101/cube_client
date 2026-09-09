import type { CubeStateResponseDto } from './cubes.js';
import type { MoveDto } from './moves.js';

export type CommutatorPartDto = 'A' | 'B' | 'A_INVERSE' | 'B_INVERSE';

export interface CommutatorRequestDto {
  readonly a: string;
  readonly b: string;
}

export interface CommutatorBoundaryDto {
  readonly part: CommutatorPartDto;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly moves: readonly MoveDto[];
}

export interface PreparedCommutatorResponseDto {
  readonly sequence: string;
  readonly moves: readonly MoveDto[];
  readonly boundaries: readonly CommutatorBoundaryDto[];
}

export interface CommutatorResponseDto
  extends CubeStateResponseDto, PreparedCommutatorResponseDto {}
