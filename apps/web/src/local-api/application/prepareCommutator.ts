import type { PreparedCommutatorResponseDto } from '@rubiks-learning/api-contract';
import {
  Commutator,
  InvalidMoveSequenceError,
  parseSequence,
  type MoveSequence,
} from '@rubiks-learning/cube-core';

import {
  CommutatorInputError,
  type CommutatorInputPart,
} from './CommutatorInputError.js';

/** A/Bを検証し、HTTPやCubeを知らない交換子domain objectを生成する。 */
export function createCommutator(aSource: string, bSource: string): Commutator {
  return new Commutator(parsePart('a', aSource), parsePart('b', bSource));
}

/** Cubeを変更せず、教材再生に必要な展開済み交換子を返す。 */
export function prepareCommutator(
  aSource: string,
  bSource: string,
): PreparedCommutatorResponseDto {
  const commutator = createCommutator(aSource, bSource);
  return {
    sequence: commutator.sequence.toString(),
    moves: commutator.sequence.moves,
    boundaries: commutator.boundaries,
  };
}

function parsePart(part: CommutatorInputPart, source: string): MoveSequence {
  try {
    return parseSequence(source);
  } catch (error: unknown) {
    if (error instanceof InvalidMoveSequenceError) {
      throw new CommutatorInputError(part, error.token, error.tokenIndex);
    }
    throw error;
  }
}
