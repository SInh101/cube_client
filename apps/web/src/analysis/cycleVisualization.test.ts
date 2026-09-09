import type { SequenceAnalysisResponseDto } from '@rubiks-learning/api-contract';
import { describe, expect, it } from 'vitest';

import {
  createCycleStickerMarkers,
  createCycleVisualization,
  firstThreeCycle,
} from './cycleVisualization';

describe('cycleVisualization', () => {
  it('M14-VM-01: corner 3-cycleを優先選択する', () => {
    expect(firstThreeCycle(fixture())).toEqual({ kind: 'corner', index: 0 });
  });

  it('M14-VM-02: cycle順を安定IDと1/2/3 markerへ変換する', () => {
    expect(
      createCycleVisualization(fixture(), { kind: 'corner', index: 0 }),
    ).toMatchObject({
      labels: ['URF', 'DLF', 'ULB'],
      cubieIds: ['green-red-white', 'green-orange-yellow', 'blue-orange-white'],
      markers: [
        { cubieId: 'green-red-white', label: '1' },
        { cubieId: 'green-orange-yellow', label: '2' },
        { cubieId: 'blue-orange-white', label: '3' },
      ],
    });
  });

  it('M14-VM-03: corner 3-cycleを3本の向き付きsticker cycleへ分解する', () => {
    const visualization = createCycleVisualization(fixture(), {
      kind: 'corner',
      index: 0,
    });
    expect(visualization?.stickerCycles.map(({ labels }) => labels)).toEqual([
      ['URF', 'LDF', 'ULB'],
      ['FUR', 'DLF', 'BUL'],
      ['RUF', 'FDL', 'LUB'],
    ]);
  });

  it('M14-VM-04: 選択した3ステッカーだけを現在面へ配置する', () => {
    const visualization = createCycleVisualization(fixture(), {
      kind: 'corner',
      index: 0,
    });
    expect(
      createCycleStickerMarkers(solvedState(), visualization?.stickerCycles[0]),
    ).toEqual([
      { cubieId: 'green-red-white', face: 'U', label: '1' },
      { cubieId: 'green-orange-yellow', face: 'L', label: '2' },
      { cubieId: 'blue-orange-white', face: 'U', label: '3' },
    ]);
  });
});

function fixture(): SequenceAnalysisResponseDto {
  const entries = [
    {
      cubieId: 'green-red-white',
      from: [1, 1, 1] as const,
      to: [-1, 1, -1] as const,
      fromLabel: 'URF',
      toLabel: 'ULB',
    },
    {
      cubieId: 'green-orange-yellow',
      from: [-1, -1, 1] as const,
      to: [1, 1, 1] as const,
      fromLabel: 'DLF',
      toLabel: 'URF',
    },
    {
      cubieId: 'blue-orange-white',
      from: [-1, 1, -1] as const,
      to: [-1, -1, 1] as const,
      fromLabel: 'ULB',
      toLabel: 'DLF',
    },
  ];
  return {
    cubeId: 'cube',
    sequence: "R' D R U2 R' D' R U2",
    moves: ["R'", 'D', 'R', 'U2', "R'", "D'", 'R', 'U2'],
    state: solvedState(),
    resultState: resultState(),
    analysis: {
      identity: false,
      corners: {
        identity: false,
        permutation: entries,
        cycles: [['DLF', 'URF', 'ULB']],
        threeCycles: [['DLF', 'URF', 'ULB']],
        fixedCubieLabels: [],
        orientationChanges: [],
      },
      edges: {
        identity: true,
        permutation: [],
        cycles: [],
        threeCycles: [],
        fixedCubieLabels: [],
        orientationChanges: [],
      },
    },
  };
}

function solvedState(): SequenceAnalysisResponseDto['state'] {
  return {
    faces: {
      U: Array(9).fill('white'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      B: Array(9).fill('blue'),
    },
  } as unknown as SequenceAnalysisResponseDto['state'];
}

function resultState(): SequenceAnalysisResponseDto['state'] {
  return {
    faces: {
      U: [
        'white',
        'white',
        'white',
        'white',
        'white',
        'white',
        'white',
        'white',
        'orange',
      ],
      R: ['green', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
      F: [
        'green',
        'green',
        'yellow',
        'green',
        'green',
        'green',
        'orange',
        'green',
        'green',
      ],
      D: [
        'blue',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
        'yellow',
      ],
      L: [
        'red',
        'orange',
        'orange',
        'orange',
        'orange',
        'orange',
        'orange',
        'orange',
        'white',
      ],
      B: [
        'blue',
        'blue',
        'green',
        'blue',
        'blue',
        'blue',
        'blue',
        'blue',
        'blue',
      ],
    },
  };
}
