import type { CubeStateResponseDto } from '@rubiks-learning/api-contract';

import { cubeRepository } from '../repository/sharedCubeRepository.js';
import { CubeNotFoundError } from './CubeNotFoundError.js';

export async function getCube(cubeId: string): Promise<CubeStateResponseDto> {
  const cube = await cubeRepository.findById(cubeId);

  if (cube === undefined) {
    throw new CubeNotFoundError(cubeId);
  }

  return {
    cubeId,
    state: cube.getState(),
  };
}
