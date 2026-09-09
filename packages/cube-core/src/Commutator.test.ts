import { describe, expect, it } from 'vitest';

import { Commutator } from './Commutator.js';
import { parseSequence } from './MoveSequence.js';

describe('Commutator', () => {
  it('M11-HP-01: A B A^-1 B^-1を生成する', () => {
    const commutator = new Commutator(
      parseSequence('R U'),
      parseSequence("F'"),
    );

    expect(commutator.sequence.toString()).toBe("R U F' U' R' F");
  });

  it('M11-HP-02: 4部分の半開区間とMoveを返す', () => {
    const commutator = new Commutator(
      parseSequence('R U'),
      parseSequence("F'"),
    );

    expect(commutator.boundaries).toEqual([
      { part: 'A', startIndex: 0, endIndex: 2, moves: ['R', 'U'] },
      { part: 'B', startIndex: 2, endIndex: 3, moves: ["F'"] },
      {
        part: 'A_INVERSE',
        startIndex: 3,
        endIndex: 5,
        moves: ["U'", "R'"],
      },
      { part: 'B_INVERSE', startIndex: 5, endIndex: 6, moves: ['F'] },
    ]);
  });

  it('M11-BD-01: 空のA/Bでも4境界を維持する', () => {
    const commutator = new Commutator(parseSequence(''), parseSequence(''));
    expect(commutator.sequence.length).toBe(0);
    expect(commutator.boundaries).toHaveLength(4);
    expect(commutator.boundaries.every((part) => part.startIndex === 0)).toBe(
      true,
    );
  });
});
