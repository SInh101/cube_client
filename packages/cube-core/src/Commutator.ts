import { invertSequence, MoveSequence } from './MoveSequence.js';
import type { Move } from './types.js';

export type CommutatorPart = 'A' | 'B' | 'A_INVERSE' | 'B_INVERSE';

export interface CommutatorBoundary {
  readonly part: CommutatorPart;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly moves: readonly Move[];
}

/** [A, B] = A B A^-1 B^-1 と教材表示用の境界を生成する。 */
export class Commutator {
  readonly sequence: MoveSequence;
  readonly boundaries: readonly CommutatorBoundary[];

  constructor(
    readonly a: MoveSequence,
    readonly b: MoveSequence,
  ) {
    const parts: readonly [CommutatorPart, MoveSequence][] = [
      ['A', a],
      ['B', b],
      ['A_INVERSE', invertSequence(a)],
      ['B_INVERSE', invertSequence(b)],
    ];
    const moves: Move[] = [];
    const boundaries: CommutatorBoundary[] = [];

    for (const [part, partSequence] of parts) {
      const startIndex = moves.length;
      moves.push(...partSequence);
      boundaries.push(
        Object.freeze({
          part,
          startIndex,
          endIndex: moves.length,
          moves: partSequence.moves,
        }),
      );
    }

    this.sequence = new MoveSequence(moves);
    this.boundaries = Object.freeze(boundaries);
  }
}
