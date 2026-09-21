import { describe, expect, it } from 'vitest';
import {
  Cube,
  FACES,
  MOVES,
  type CubeState,
  type Face,
  type Color,
} from '@rubiks-learning/cube-core';
import {
  analyzeBlindfold,
  checkMemo,
  exchange,
  formatMemo,
  netSticker,
  parseMemo,
  randomScramble,
  readStickers,
  stickers,
  validateLabels,
  type PieceKind,
} from './blindfold';

function labels(kind: PieceKind) {
  return Object.fromEntries(
    stickers(kind).map((s, i) => [s, String.fromCharCode(65 + i)]),
  );
}
// Build a face-state fixture from sticker placements, independently of the exchange algorithm.
function fixture(placements: Record<string, string>): CubeState {
  const solved = Cube.solved().getState();
  const faces = Object.fromEntries(
    FACES.map((face) => [face, Array.from(solved.faces[face])]),
  ) as Record<Face, Color[]>;
  for (const face of FACES)
    for (let i = 0; i < 9; i++) {
      const s = netSticker(face, i);
      if (s && placements[s])
        faces[face][i] = solved.faces[placements[s]![0] as Face][4];
    }
  return { faces } as unknown as CubeState;
}
describe('3BLD analysis', () => {
  it('produces the requested うえ example without the buffer label', () => {
    const state = fixture({
      UB: 'UF',
      BU: 'FU',
      UF: 'UL',
      FU: 'LU',
      UL: 'UB',
      LU: 'BU',
    });
    const result = analyzeBlindfold(state, 'edge', 'UB', false);
    expect(result.targets).toEqual(['UF', 'UL']);
    expect(
      formatMemo(
        result.targets,
        { ...labels('edge'), UB: 'あ', UR: 'い', UF: 'う', UL: 'え' },
        'edge',
      ),
    ).toBe('うえ');
  });
  it('accepts different entry points and cycle order, rejects incomplete sequences', () => {
    const state = fixture({
      UF: 'UL',
      FU: 'LU',
      UL: 'UF',
      LU: 'FU',
      DF: 'DR',
      FD: 'RD',
      DR: 'DF',
      RD: 'FD',
    });
    expect(
      checkMemo(state, 'edge', 'UB', ['UL', 'UF', 'UL', 'DR', 'DF', 'DR'], true)
        .solved,
    ).toBe(true);
    expect(
      checkMemo(state, 'edge', 'UB', ['DF', 'DR', 'DF', 'UF', 'UL', 'UF'], true)
        .solved,
    ).toBe(true);
    expect(checkMemo(state, 'edge', 'UB', ['UL', 'UF'], true).solved).toBe(
      false,
    );
    expect(() => checkMemo(state, 'edge', 'UB', ['BU'], true)).toThrow(
      'バッファ自身',
    );
    expect(() =>
      checkMemo(Cube.solved().getState(), 'edge', '', [], true),
    ).toThrow('無効なステッカー');
  });
  it('separates flips and twists or incorporates them into solving exchanges', () => {
    const state = fixture({
      UB: 'BU',
      BU: 'UB',
      UF: 'FU',
      FU: 'UF',
      UFR: 'FRU',
      FRU: 'RUF',
      RUF: 'UFR',
      UBL: 'LUB',
      BLU: 'UBL',
      LUB: 'BLU',
    });
    for (const kind of ['edge', 'corner'] as const) {
      const buffer = kind === 'edge' ? 'UB' : 'UFR';
      const separate = analyzeBlindfold(state, kind, buffer, false);
      expect(separate.targets).toEqual([]);
      expect(separate.orientations).toHaveLength(2);
      expect(checkMemo(state, kind, buffer, [], false).solved).toBe(true);
      expect(checkMemo(state, kind, buffer, [], true).solved).toBe(false);
      const combined = analyzeBlindfold(state, kind, buffer, true);
      expect(
        checkMemo(state, kind, buffer, combined.targets, true).solved,
      ).toBe(true);
      expect(combined.orientations).toEqual([]);
    }
  });
  it('solves deterministic randomized states for every buffer and both orientation options', () => {
    let seed = 3181;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let i = 0; i < 30; i++) {
      const cube = Cube.solved();
      for (let j = 0; j < 30; j++)
        cube.applyMove(MOVES[Math.floor(random() * MOVES.length)]!);
      const state = cube.getState();
      for (const kind of ['edge', 'corner'] as const)
        for (const buffer of stickers(kind))
          for (const include of [false, true]) {
            const result = analyzeBlindfold(state, kind, buffer, include);
            expect(
              checkMemo(state, kind, buffer, result.targets, include).solved,
            ).toBe(true);
            // Applying the inverse exchanges to solved recreates the original sticker permutation.
            if (include) {
              const restored = Object.fromEntries(
                stickers(kind).map((s) => [s, s]),
              );
              [...result.targets]
                .reverse()
                .forEach((t) => exchange(restored, buffer, t));
              expect(restored).toEqual(readStickers(state, kind));
            }
          }
    }
  });
  it('maps the net to 48 unique stickers and clockwise U edge positions', () => {
    const net = FACES.flatMap((f) =>
      Array.from({ length: 9 }, (_, i) => netSticker(f, i)),
    ).filter(Boolean);
    expect(new Set(net).size).toBe(48);
    expect([1, 5, 7, 3].map((i) => netSticker('U', i))).toEqual([
      'UB',
      'UR',
      'UF',
      'UL',
    ]);
  });
  it('validates labels and parses unicode and separated multi-character labels', () => {
    const table = { ...labels('edge'), UB: 'あ', UF: 'う', UL: 'え' };
    expect(parseMemo('うえ', table, 'edge')).toEqual(['UF', 'UL']);
    expect(parseMemo('う え', table, 'edge')).toEqual(['UF', 'UL']);
    expect(() => parseMemo('?', table, 'edge')).toThrow('未登録');
    expect(() => validateLabels({ ...table, UF: 'あ' }, 'edge')).toThrow(
      '異なる',
    );
    expect(() => validateLabels({ ...table, UF: '' }, 'edge')).toThrow(
      '全ステッカー',
    );
    expect(
      parseMemo('front left', { ...table, UF: 'front', UL: 'left' }, 'edge'),
    ).toEqual(['UF', 'UL']);
  });
  it('generates 25 valid moves without repeating adjacent axes', () => {
    const result = randomScramble(() => 0.5);
    expect(result).toHaveLength(25);
    result.forEach((move, i) => {
      expect(MOVES).toContain(move);
      if (i) expect(move[0]).not.toBe(result[i - 1]![0]);
    });
  });
});
