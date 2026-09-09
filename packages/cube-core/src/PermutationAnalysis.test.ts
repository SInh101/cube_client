import { describe, expect, it } from 'vitest';

import { Cube } from './Cube.js';
import {
  analyzePermutation,
  cubiePositionLabel,
} from './PermutationAnalysis.js';
import { parseSequence } from './MoveSequence.js';

describe('Permutation analysis', () => {
  it('M13-AN-01: identityは全cubieがfixedでcycleを持たない', () => {
    const state = Cube.solved().getState();
    const analysis = analyzePermutation(state, state);
    expect(analysis.permutation).toHaveLength(26);
    expect(analysis.fixedCubieIds).toHaveLength(26);
    expect(analysis.cycles).toEqual([]);
    expect(analysis.orientationChanges).toEqual([]);
  });

  it('M13-AN-02: Rはcornerとedgeの4-cycleへ分解できる', () => {
    const cube = Cube.solved();
    const before = cube.getState();
    cube.applyMove('R');
    const analysis = analyzePermutation(before, cube.getState());

    expect(analysis.cycles.map(({ length }) => length).sort()).toEqual([4, 4]);
    expect(analysis.fixedCubieIds).toHaveLength(18);
  });

  it('M13-AN-03: Rでcorner orientation changeを検出する', () => {
    const cube = Cube.solved();
    const before = cube.getState();
    cube.applyMove('R');
    const changes = analyzePermutation(
      before,
      cube.getState(),
    ).orientationChanges;

    expect(changes.filter(({ kind }) => kind === 'corner')).toHaveLength(4);
    expect(changes.every(({ delta }) => delta === 1 || delta === 2)).toBe(true);
  });

  it('M13-AN-03b: Fで4 edgeのorientation changeを検出する', () => {
    const cube = Cube.solved();
    const before = cube.getState();
    cube.applyMove('F');
    const changes = analyzePermutation(
      before,
      cube.getState(),
    ).orientationChanges;

    expect(changes.filter(({ kind }) => kind === 'edge')).toHaveLength(4);
  });

  it('M13-AN-04: 3-cycleをcycle decompositionから抽出する', () => {
    const cube = Cube.solved();
    const before = cube.getState();
    for (const move of parseSequence("R U' R' D R U R' D'")) {
      cube.applyMove(move);
    }
    const analysis = analyzePermutation(before, cube.getState());

    expect(analysis.threeCycles.length).toBeGreaterThan(0);
    expect(analysis.threeCycles.every(({ length }) => length === 3)).toBe(true);
  });

  it('M13-AN-05: 教材用のcorner/edge position名を返す', () => {
    expect(cubiePositionLabel([1, 1, 1])).toBe('URF');
    expect(cubiePositionLabel([-1, 1, -1])).toBe('ULB');
    expect(cubiePositionLabel([-1, -1, 1])).toBe('DLF');
    expect(cubiePositionLabel([1, 1, 0])).toBe('UR');
  });

  it('M13-AN-06: orientation deltaはcorner mod 3、edge mod 2の範囲に収まる', () => {
    const cube = Cube.solved();
    const before = cube.getState();
    for (const move of parseSequence("R U F' L D B")) cube.applyMove(move);
    const changes = analyzePermutation(
      before,
      cube.getState(),
    ).orientationChanges;
    expect(
      changes
        .filter(({ kind }) => kind === 'edge')
        .every(({ delta }) => delta === 1),
    ).toBe(true);
    expect(
      changes
        .filter(({ kind }) => kind === 'corner')
        .every(({ delta }) => delta === 1 || delta === 2),
    ).toBe(true);
    expect(
      changes
        .filter(({ kind }) => kind === 'edge')
        .reduce((sum, { delta }) => sum + delta, 0) % 2,
    ).toBe(0);
    expect(
      changes
        .filter(({ kind }) => kind === 'corner')
        .reduce((sum, { delta }) => sum + delta, 0) % 3,
    ).toBe(0);
  });
});
