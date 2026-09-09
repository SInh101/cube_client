import type { MoveSequenceResponseDto } from '@rubiks-learning/api-contract';
import { parseSequence } from '@rubiks-learning/cube-core';

/**
 * sequence全体を検証し、Frontendが一手ずつ再生できるDTOへ変換する。
 *
 * - CubeやRepositoryを変更しない
 */
export function prepareMoveSequence(sequence: string): MoveSequenceResponseDto {
  return { moves: parseSequence(sequence).moves };
}
