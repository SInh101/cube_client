import type { Cube } from '@rubiks-learning/cube-core';

/** Cubeの保存方法をapplication層から隠す境界。 */
export interface CubeRepository {
  save(cubeId: string, cube: Cube): Promise<void>;
  findById(cubeId: string): Promise<Cube | undefined>;
}
