import type { CommutatorResponseDto } from '@rubiks-learning/api-contract';

import { cubeRepository } from '../repository/sharedCubeRepository.js';
import { CubeNotFoundError } from './CubeNotFoundError.js';
import { createCommutator } from './prepareCommutator.js';

/** 交換子を完全に検証してから対象Cubeへ適用し、教材表示用情報を返す。 */
export async function applyCommutatorToCube(
  cubeId: string,
  aSource: string,
  bSource: string,
): Promise<CommutatorResponseDto> {
  const commutator = createCommutator(aSource, bSource);
  const cube = await cubeRepository.findById(cubeId);

  if (cube === undefined) throw new CubeNotFoundError(cubeId);

  for (const move of commutator.sequence) cube.applyMove(move);
  await cubeRepository.save(cubeId, cube);

  return {
    cubeId,
    sequence: commutator.sequence.toString(),
    moves: commutator.sequence.moves,
    boundaries: commutator.boundaries,
    state: cube.getState(),
  };
}
