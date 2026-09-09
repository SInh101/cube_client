import type { MoveDto } from './moves.js';

export interface MoveSequenceRequestDto {
  readonly sequence: string;
}

export interface MoveSequenceResponseDto {
  readonly moves: readonly MoveDto[];
}
