import { describe, expect, it } from 'vitest';
import { Cube } from './Cube.js';

describe('Cube persistence', () => {
  it('stateから同じCubeを復元できる', () => {
    const original = Cube.solved();
    for (const move of ['R', 'U', "F'", 'L2'] as const)
      original.applyMove(move);
    const restored = Cube.fromState(original.getState());
    expect(restored.getState()).toEqual(original.getState());
    restored.applyMove('D');
    original.applyMove('D');
    expect(restored.getState()).toEqual(original.getState());
  });
});
