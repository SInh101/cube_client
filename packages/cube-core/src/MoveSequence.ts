import { MOVES, type Move } from './types.js';

const MOVE_SET = new Set<string>(MOVES);

/** Singmaster記法のMove列を不変値として保持する。 */
export class MoveSequence implements Iterable<Move> {
  readonly moves: readonly Move[];

  constructor(moves: Iterable<Move>) {
    this.moves = Object.freeze([...moves]);
  }

  get length(): number {
    return this.moves.length;
  }

  [Symbol.iterator](): Iterator<Move> {
    return this.moves[Symbol.iterator]();
  }

  toString(): string {
    return this.moves.join(' ');
  }
}

/** 空白区切りのSingmaster記法をMoveSequenceへ変換する。 */
export function parseSequence(source: string): MoveSequence {
  const tokens = source.trim() === '' ? [] : source.trim().split(/\s+/u);
  const moves = tokens.map((token, index) => {
    if (!MOVE_SET.has(token)) {
      throw new InvalidMoveSequenceError(token, index);
    }
    return token as Move;
  });
  return new MoveSequence(moves);
}

/** Move順を反転し、それぞれを逆Moveへ変換する。 */
export function invertSequence(sequence: MoveSequence): MoveSequence {
  return new MoveSequence([...sequence].reverse().map(invertMove));
}

/** setup Xと手順Aから共役 X A X' を構成する。 */
export function conjugateSequence(
  setup: MoveSequence,
  sequence: MoveSequence,
): MoveSequence {
  return new MoveSequence([...setup, ...sequence, ...invertSequence(setup)]);
}

export class InvalidMoveSequenceError extends Error {
  constructor(
    readonly token: string,
    readonly tokenIndex: number,
  ) {
    super(`Invalid move at token ${tokenIndex + 1}: ${token}`);
    this.name = 'InvalidMoveSequenceError';
  }
}

function invertMove(move: Move): Move {
  if (move.endsWith('2')) return move;
  return move.endsWith("'") ? (move[0] as Move) : (`${move}'` as Move);
}
