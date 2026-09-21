import {
  snapshotCubies,
  type CubeState,
  type Face,
  type Move,
} from '@rubiks-learning/cube-core';

export type PieceKind = 'edge' | 'corner';
// All corner triples have the same handedness. Rotations name their other stickers.
const PIECES = {
  edge: [
    'UB',
    'UR',
    'UF',
    'UL',
    'FR',
    'FL',
    'BR',
    'BL',
    'DF',
    'DR',
    'DB',
    'DL',
  ],
  corner: ['UFR', 'URB', 'UBL', 'ULF', 'DFL', 'DLB', 'DBR', 'DRF'],
};
export const rotate = (s: string, n: number) => s.slice(n) + s.slice(0, n);
export const stickers = (kind: PieceKind) =>
  PIECES[kind].flatMap((s) => Array.from(s, (_, i) => rotate(s, i)));
export const samePiece = (a: string, b: string) =>
  [...a].sort().join('') === [...b].sort().join('');
export function normalizeSticker(s: string, kind: PieceKind): string {
  const value = s.trim().toUpperCase();
  const found = stickers(kind).find(
    (t) => t[0] === value[0] && samePiece(t, value),
  );
  if (!found) throw new Error(`無効なステッカー: ${s}`);
  return found;
}
export type StickerMap = Record<string, string>;
export function readStickers(state: CubeState, kind: PieceKind): StickerMap {
  // Centers define the current frame, including after slice moves.
  const colors = Object.fromEntries(
    Object.entries(state.faces).map(([f, cells]) => [cells[4], f]),
  );
  const cubies = snapshotCubies(state).filter((c) => c.kind === kind);
  return Object.fromEntries(
    stickers(kind).map((s) => {
      const cubie = cubies.find((c) =>
        samePiece(Object.keys(c.stickers).join(''), s),
      )!;
      return [
        s,
        normalizeSticker(
          [...s].map((f) => colors[cubie.stickers[f as Face]!]).join(''),
          kind,
        ),
      ];
    }),
  );
}
/** Exchange whole pieces, aligning the named stickers and their cyclic companions. */
export function exchange(
  map: StickerMap,
  buffer: string,
  target: string,
): void {
  if (samePiece(buffer, target))
    throw new Error('バッファ自身のピースは交換先にできません。');
  for (let i = 0; i < buffer.length; i++) {
    const a = rotate(buffer, i),
      b = rotate(target, i);
    [map[a], map[b]] = [map[b]!, map[a]!];
  }
}
export function orientations(map: StickerMap, kind: PieceKind): string[] {
  return PIECES[kind]
    .filter((p) => samePiece(p, map[p]!) && p !== map[p])
    .map((p) => `${p} ← ${map[p]}`);
}
export function isSolved(
  map: StickerMap,
  includeOrientation: boolean,
): boolean {
  return Object.entries(map).every(([p, occupant]) =>
    includeOrientation ? p === occupant : samePiece(p, occupant),
  );
}
export function analyzeBlindfold(
  state: CubeState,
  kind: PieceKind,
  bufferInput: string,
  includeOrientation: boolean,
) {
  const buffer = normalizeSticker(bufferInput, kind);
  const map = readStickers(state, kind);
  const targets: string[] = [];
  while (!isSolved(map, includeOrientation)) {
    if (targets.length > 100)
      throw new Error(
        'この状態の互換列を生成できません。センターの配置を確認してください。',
      );
    const occupant = map[buffer]!;
    const target = !samePiece(buffer, occupant)
      ? occupant
      : PIECES[kind].find(
          (p) =>
            !samePiece(p, buffer) &&
            (includeOrientation ? map[p] !== p : !samePiece(p, map[p]!)),
        );
    if (!target)
      throw new Error(
        '単独の反転・ねじれが残っています。キューブの状態を確認してください。',
      );
    exchange(map, buffer, target);
    targets.push(target);
  }
  return { targets, orientations: orientations(map, kind) };
}
export function validateLabels(
  labels: Record<string, string>,
  kind: PieceKind,
): void {
  const values = stickers(kind).map((s) => labels[s]?.normalize('NFC').trim());
  if (values.some((s) => !s || /[\s,、]/u.test(s)))
    throw new Error(
      '全ステッカーに空白・カンマを含まない文字を設定してください。',
    );
  if (new Set(values).size !== values.length)
    throw new Error('同じ種類のステッカーには異なる文字を設定してください。');
}
export function parseMemo(
  memo: string,
  labels: Record<string, string>,
  kind: PieceKind,
): string[] {
  validateLabels(labels, kind);
  const entries = stickers(kind).map(
    (s) => [labels[s]!.normalize('NFC').trim(), s] as const,
  );
  const input = memo.normalize('NFC').trim();
  if (!input) return [];
  const tokens = entries.every(([label]) => Array.from(label).length === 1)
    ? Array.from(input.replace(/[\s,、]/gu, ''))
    : input.split(/[\s,、]+/u);
  return tokens.map((t) => {
    const found = entries.find(([label]) => label === t);
    if (!found)
      throw new Error(
        `未登録の文字: ${t}（複数文字の割当は空白で区切ってください）`,
      );
    return found[1];
  });
}
export function formatMemo(
  targets: readonly string[],
  labels: Record<string, string>,
  kind: PieceKind,
): string {
  const separator = stickers(kind).every(
    (s) => Array.from(labels[s]!.trim()).length === 1,
  )
    ? ''
    : ' ';
  return targets.map((s) => labels[s]!.normalize('NFC').trim()).join(separator);
}
export function checkMemo(
  state: CubeState,
  kind: PieceKind,
  buffer: string,
  targets: string[],
  includeOrientation: boolean,
) {
  const normalizedBuffer = normalizeSticker(buffer, kind);
  const map = readStickers(state, kind);
  targets.forEach((t) => exchange(map, normalizedBuffer, t));
  return {
    solved: isSolved(map, includeOrientation),
    orientations: orientations(map, kind),
  };
}
export function randomScramble(random = Math.random): Move[] {
  const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
  const moves: Move[] = [];
  let previousAxis = -1;
  for (let i = 0; i < 25; i++) {
    const candidates = faces.filter(
      (_, j) => Math.floor(j / 2) !== previousAxis,
    );
    const face = candidates[Math.floor(random() * candidates.length)]!;
    previousAxis = Math.floor(faces.indexOf(face) / 2);
    moves.push(`${face}${['', "'", '2'][Math.floor(random() * 3)]}` as Move);
  }
  return moves;
}
export function netSticker(face: Face, index: number): string | undefined {
  if (index === 4) return undefined;
  const row = Math.floor(index / 3),
    col = index % 3;
  const neighbors: Record<Face, string[]> = {
    U: ['B', 'F', 'L', 'R'],
    D: ['F', 'B', 'L', 'R'],
    F: ['U', 'D', 'L', 'R'],
    B: ['U', 'D', 'R', 'L'],
    R: ['U', 'D', 'F', 'B'],
    L: ['U', 'D', 'B', 'F'],
  };
  const n = neighbors[face];
  const s =
    face +
    (row === 0 ? n[0] : row === 2 ? n[1] : '') +
    (col === 0 ? n[2] : col === 2 ? n[3] : '');
  return normalizeSticker(s, s.length === 2 ? 'edge' : 'corner');
}
