import type { Cube } from '@rubiks-learning/cube-core';
import type { CubeRepository } from './CubeRepository.js';

/** Milestone 2用の、process memoryだけに保存する暫定repository。 */
export class InMemoryCubeRepository implements CubeRepository {
  private readonly cubes = new Map<string, Cube>();

  async save(cubeId: string, cube: Cube): Promise<void> {
    this.cubes.set(cubeId, cube);
  }

  async findById(cubeId: string): Promise<Cube | undefined> {
    return this.cubes.get(cubeId);
  }
}
