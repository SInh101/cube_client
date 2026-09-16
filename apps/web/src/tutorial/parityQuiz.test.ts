import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  permutationParity,
  scrambledState,
  randomParityScramble,
  startParitySession,
  answerParitySession,
  type ParityQuizConfig,
} from './parityQuiz';

afterEach(() => vi.restoreAllMocks());
describe('permutation parity', () => {
  it.each(['edge', 'corner'] as const)(
    '%s: identity, quarter turn, half turn and commutator',
    (pieces) => {
      expect(permutationParity(scrambledState([]), pieces)).toBe('even');
      expect(permutationParity(scrambledState(['R']), pieces)).toBe('odd');
      expect(permutationParity(scrambledState(['R2']), pieces)).toBe('even');
      expect(
        permutationParity(scrambledState(['R', 'U', "R'", "U'"]), pieces),
      ).toBe('even');
    },
  );
  it('checks random states against an independent move-sign oracle with both parities', () => {
    let seed = 42;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const observed = new Set();
    const states = new Set();
    for (let i = 0; i < 100; i++) {
      const moves = randomParityScramble(random);
      const expected =
        moves.filter((move) => !move.endsWith('2')).length % 2 === 0
          ? 'even'
          : 'odd';
      const state = scrambledState(moves);
      expect(permutationParity(state, 'edge')).toBe(expected);
      expect(permutationParity(state, 'corner')).toBe(expected);
      observed.add(expected);
      states.add(JSON.stringify(state));
    }
    expect(observed.size).toBe(2);
    expect(states.size).toBe(100);
  });
  it('fixed answers retain their board and reset their score', () => {
    const config: ParityQuizConfig = {
      pieces: 'edge',
      mode: 'fixed',
      scramble: ['R'],
      answer: 'odd',
    };
    const initial = startParitySession(config);
    const wrong = answerParitySession(initial, config, 'even');
    const right = answerParitySession(wrong, config, 'odd');
    expect(wrong.feedback).toContain('不正解');
    expect(right.correct).toBe(1);
    expect(right.attempts).toBe(2);
    expect(right.state).toBe(initial.state);
    expect(startParitySession(config)).toEqual(initial);
  });
});
