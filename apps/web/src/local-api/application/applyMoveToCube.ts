import type {
  CubeStateResponseDto,
  MoveBatchResponseDto,
} from '@rubiks-learning/api-contract';
import type { Move } from '@rubiks-learning/cube-core';

import { cubeRepository } from '../repository/sharedCubeRepository.js';
import { CubeNotFoundError } from './CubeNotFoundError.js';

export async function applyMoveToCube(
  cubeId: string,
  move: Move,
): Promise<CubeStateResponseDto> {
  const cube = await cubeRepository.findById(cubeId);

  if (cube === undefined) {
    throw new CubeNotFoundError(cubeId);
  }

  cube.applyMove(move);

  await cubeRepository.save(cubeId, cube);

  return {
    cubeId,
    state: cube.getState(),
  };
}

/** 複数moveを順に適用し、永続化は最後の1回だけ行う。 */
export async function applyMovesToCube(
  cubeId: string,
  moves: readonly Move[],
): Promise<MoveBatchResponseDto> {
  const cube = await cubeRepository.findById(cubeId);
  if (cube === undefined) throw new CubeNotFoundError(cubeId);

  const states = moves.map((move) => {
    cube.applyMove(move);
    return cube.getState();
  });
  await cubeRepository.save(cubeId, cube);

  return { cubeId, moves, states, state: cube.getState() };
}
