import { InMemoryCubeRepository } from './InMemoryCubeRepository.js';
import type { CubeRepository } from './CubeRepository.js';

/** 各handlerで同じin-memory stateを参照する共有instance。 */
export const cubeRepository: CubeRepository = new InMemoryCubeRepository();
