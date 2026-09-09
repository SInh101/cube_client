import type { CreateCubeResponseDto } from '@rubiks-learning/api-contract';

import { cubeRepository } from '../repository/sharedCubeRepository.js';
import { createCubeId } from './createCubeId.js';
import { createSolvedCube } from './createSolvedCube.js';

export async function createCube(): Promise<CreateCubeResponseDto> {
  const cubeId = createCubeId();
  const cube = createSolvedCube();

  await cubeRepository.save(cubeId, cube);

  return { cubeId, state: cube.getState() };
}
