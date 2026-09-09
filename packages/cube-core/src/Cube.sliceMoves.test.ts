import { describe, expect, it } from 'vitest';

import { Cube, type Move } from './index.js';

describe('slice moves', () => {
  it('M sends the U middle column to the F middle column', () => {
    const cube = Cube.solved();
    cube.applyMove('M');
    expect(column(cube.getState().faces.F, 1)).toEqual([
      'white',
      'white',
      'white',
    ]);
  });

  it('E sends the F middle row to the R middle row', () => {
    const cube = Cube.solved();
    cube.applyMove('E');
    expect(row(cube.getState().faces.R, 1)).toEqual([
      'green',
      'green',
      'green',
    ]);
  });

  it('S sends the R middle column to the D middle row', () => {
    const cube = Cube.solved();
    cube.applyMove('S');
    expect(row(cube.getState().faces.D, 1)).toEqual(['red', 'red', 'red']);
  });

  it.each(['M', 'E', 'S'] as const)(
    '%s supports inverse and double turns',
    (move) => {
      const solved = Cube.solved().getState();
      const inverse = Cube.solved();
      inverse.applyMove(move);
      inverse.applyMove(`${move}'` as Move);
      expect(inverse.getState()).toEqual(solved);

      const double = Cube.solved();
      const quarters = Cube.solved();
      double.applyMove(`${move}2` as Move);
      quarters.applyMove(move);
      quarters.applyMove(move);
      expect(double.getState()).toEqual(quarters.getState());
    },
  );
});

function row<T>(values: readonly T[], index: number): readonly T[] {
  return values.slice(index * 3, index * 3 + 3);
}

function column<T>(values: readonly T[], index: number): readonly T[] {
  return [values[index]!, values[index + 3]!, values[index + 6]!];
}
