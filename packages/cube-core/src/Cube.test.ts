import { describe, expect, it } from 'vitest';
import { Cube, FACES, MOVES, type Move } from './index';

describe('Cube', () => {
  it('M13-AN-07: cloneの回転は元Cubeを変更しない', () => {
    const cube = Cube.solved();
    const before = cube.getState();
    const cloned = cube.clone();
    cloned.applyMove('R');
    expect(cube.getState()).toEqual(before);
    expect(cloned.getState()).not.toEqual(before);
  });
  it('creates a solved cube with nine stickers of one color on every face', () => {
    const state = Cube.solved().getState();

    for (const face of FACES) {
      expect(new Set(state.faces[face])).toHaveLength(1);
      expect(state.faces[face]).toHaveLength(9);
    }
  });

  it('returns a snapshot that is not changed by later moves', () => {
    const cube = Cube.solved();
    const snapshot = cube.getState();

    cube.applyMove('R');

    expect(snapshot).toEqual(Cube.solved().getState());
    expect(cube.getState()).not.toEqual(snapshot);
  });

  it('restores the solved state with reset', () => {
    const cube = Cube.solved();
    cube.applyMove('R');
    cube.applyMove('U');

    cube.reset();

    expect(cube.getState()).toEqual(Cube.solved().getState());
  });

  it('turns F clockwise when viewed from the front', () => {
    const cube = Cube.solved();

    cube.applyMove('F');

    const { faces } = cube.getState();
    expect(faces.U.slice(6, 9)).toEqual(['orange', 'orange', 'orange']);
    expect([faces.R[0], faces.R[3], faces.R[6]]).toEqual([
      'white',
      'white',
      'white',
    ]);
    expect(faces.D.slice(0, 3)).toEqual(['red', 'red', 'red']);
    expect([faces.L[2], faces.L[5], faces.L[8]]).toEqual([
      'yellow',
      'yellow',
      'yellow',
    ]);
  });

  it.each(['R', 'L', 'U', 'D', 'F', 'B'] as const)(
    '%s^4 is identity',
    (move) => {
      const cube = Cube.solved();
      apply(cube, move, move, move, move);
      expect(cube.getState()).toEqual(Cube.solved().getState());
    },
  );

  it.each(['R', 'L', 'U', 'D', 'F', 'B'] as const)(
    '%s followed by its inverse is identity',
    (move) => {
      const cube = Cube.solved();
      apply(cube, move, `${move}'` as Move);
      expect(cube.getState()).toEqual(Cube.solved().getState());
    },
  );

  it.each(['R', 'L', 'U', 'D', 'F', 'B'] as const)(
    '%s2 equals two quarter turns',
    (move) => {
      const doubleMove = Cube.solved();
      const twoQuarterTurns = Cube.solved();

      doubleMove.applyMove(`${move}2` as Move);
      apply(twoQuarterTurns, move, move);

      expect(doubleMove.getState()).toEqual(twoQuarterTurns.getState());
    },
  );

  it.each(MOVES)('%s preserves all 54 stickers and color counts', (move) => {
    const cube = Cube.solved();
    cube.applyMove(move);

    const colors = FACES.flatMap((face) => [...cube.getState().faces[face]]);

    expect(colors).toHaveLength(54);
    for (const color of new Set(colors)) {
      expect(colors.filter((candidate) => candidate === color)).toHaveLength(9);
    }
  });
});

function apply(cube: Cube, ...moves: Move[]): void {
  for (const move of moves) cube.applyMove(move);
}
