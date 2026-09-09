import { describe, expect, it } from 'vitest';

import { Cube } from './Cube.js';
import {
  conjugateSequence,
  InvalidMoveSequenceError,
  invertSequence,
  MoveSequence,
  parseSequence,
} from './MoveSequence.js';

describe('MoveSequence', () => {
  it('M7-HP-01: 空白区切りの手順をparseする', () => {
    const sequence = parseSequence("R U R' U'");
    expect(sequence.moves).toEqual(['R', 'U', "R'", "U'"]);
    expect(sequence.toString()).toBe("R U R' U'");
  });

  it('M7-BD-01: 前後・連続空白を許容する', () => {
    expect(parseSequence("  R\n\tU'  ").moves).toEqual(['R', "U'"]);
  });

  it('M7-BD-02: 空文字列は空手順になる', () => {
    expect(parseSequence('')).toEqual(new MoveSequence([]));
  });

  it('M7-IV-01: 不正tokenの位置と値を返す', () => {
    expect(() => parseSequence('R X U')).toThrowError(
      expect.objectContaining<Partial<InvalidMoveSequenceError>>({
        token: 'X',
        tokenIndex: 1,
      }),
    );
  });

  it('M7-ST-01: inverseは順序と各Moveを反転する', () => {
    expect(invertSequence(parseSequence("R U2 F'")).moves).toEqual([
      'F',
      'U2',
      "R'",
    ]);
  });

  it('M7-PR-01: sequenceとinverseを適用するとsolvedへ戻る', () => {
    const cube = Cube.solved();
    const sequence = parseSequence("R U R' U' F2 L D'");
    for (const move of sequence) cube.applyMove(move);
    for (const move of invertSequence(sequence)) cube.applyMove(move);
    expect(cube.getState()).toEqual(Cube.solved().getState());
  });

  it("setup Xと手順AをX A X'へ展開する", () => {
    expect(
      conjugateSequence(
        parseSequence('U R'),
        parseSequence("R' D R"),
      ).toString(),
    ).toBe("U R R' D R R' U'");
  });
});
