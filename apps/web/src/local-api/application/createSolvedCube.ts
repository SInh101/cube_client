import { Cube } from '@rubiks-learning/cube-core';

/** HTTPに依存せず、solved状態のCubeを生成する。 */
export function createSolvedCube(): Cube {
  return Cube.solved();
}
