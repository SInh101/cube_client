import { describe, expect, it } from 'vitest';

import { Cube } from './Cube.js';
import { analyzeCubieChanges, snapshotCubies } from './CubieAnalysis.js';

describe('Cubie analysis', () => {
  it('M12-AN-01: solved stateを26個のcubieへ変換する', () => {
    const cubies = snapshotCubies(Cube.solved().getState());
    expect(cubies).toHaveLength(26);
    expect(cubies.filter(({ kind }) => kind === 'center')).toHaveLength(6);
    expect(cubies.filter(({ kind }) => kind === 'edge')).toHaveLength(12);
    expect(cubies.filter(({ kind }) => kind === 'corner')).toHaveLength(8);
    expect(new Set(cubies.map(({ id }) => id)).size).toBe(26);
  });

  it('M12-AN-02: 同じstate間には変化がない', () => {
    const state = Cube.solved().getState();
    expect(analyzeCubieChanges(state, state)).toEqual([]);
  });

  it('M12-AN-03: RでR layerの8可動cubieだけが変化する', () => {
    const cube = Cube.solved();
    const before = cube.getState();
    cube.applyMove('R');
    const changes = analyzeCubieChanges(before, cube.getState());

    expect(changes).toHaveLength(8);
    expect(changes.every(({ position }) => position[0] === 1)).toBe(true);
    expect(changes.every(({ change }) => change === 'permutation')).toBe(true);
  });

  it('M12-AN-04: R2でも対象外cubieを変化として返さない', () => {
    const cube = Cube.solved();
    const before = cube.getState();
    cube.applyMove('R2');
    expect(
      analyzeCubieChanges(before, cube.getState()).map(({ position }) =>
        position.join(','),
      ),
    ).toEqual([
      '1,-1,-1',
      '1,-1,0',
      '1,-1,1',
      '1,0,-1',
      '1,0,1',
      '1,1,-1',
      '1,1,0',
      '1,1,1',
    ]);
  });
});
