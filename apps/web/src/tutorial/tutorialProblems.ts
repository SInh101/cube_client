import type { CubeColorDto } from '@rubiks-learning/api-contract';
import { Cube } from '@rubiks-learning/cube-core';
import {
  PARITY_PROBLEM_GROUP,
  permutationParity,
  type ParityQuizConfig,
} from './parityQuiz';

import {
  CUBE_FACE_DIRECTIONS,
  createCubieViewModels,
  createMoveAnimation,
  isCubieInMoveLayer,
  type CubeFaceDirection,
  type CubeMove,
  type CubeViewState,
  type CubiePosition,
} from '../components/cubeViewModel';

export interface TutorialProblem {
  readonly id: string;
  readonly title: string;
  readonly kind: 'position' | 'sticker' | 'parity';
  readonly parity?: ParityQuizConfig;
  readonly start: string;
  readonly goal: string;
  readonly via?: string;
  readonly fix?: string;
  readonly restore?: string;
  /** 作問時とテスト時に正解可能性を保証する既知の手順。UIには表示しない。 */
  readonly verificationMoves?: readonly CubeMove[];
}

export interface TutorialProblemGroup {
  readonly id: string;
  readonly title: string;
  readonly groups?: readonly TutorialProblemGroup[];
  readonly problems?: readonly TutorialProblem[];
}

export interface TutorialProgress {
  readonly goalSatisfied: boolean;
  readonly viaSatisfied: boolean;
  readonly restoreSatisfied: boolean;
  readonly solved: boolean;
}

interface TrackedSticker {
  readonly cubieId: string;
  readonly color: CubeColorDto;
}

type PieceKind = 'edge' | 'corner';
type ProblemKind = TutorialProblem['kind'];
type ProblemClass = 'simple' | 'via' | 'fix' | 'restore' | 'combined';

const PROBLEM_CLASS_COUNTS: Readonly<Record<ProblemClass, number>> = {
  simple: 10,
  via: 8,
  fix: 8,
  restore: 8,
  combined: 10,
};
const CLASS_TITLES: Readonly<Record<ProblemClass, string>> = {
  simple: '単純問題',
  via: 'Via問題',
  fix: 'Fix問題',
  restore: 'Restore問題',
  combined: '複合問題',
};
const OUTER_MOVES = [
  'R',
  "R'",
  'R2',
  'L',
  "L'",
  'L2',
  'U',
  "U'",
  'U2',
  'D',
  "D'",
  'D2',
  'F',
  "F'",
  'F2',
  'B',
  "B'",
  'B2',
] as const satisfies readonly CubeMove[];

export const TUTORIAL_PROBLEM_GROUPS: readonly TutorialProblemGroup[] = [
  createCategory('edge-position', 'エッジ位置', 'edge', 'position'),
  createCategory('corner-position', 'コーナー位置', 'corner', 'position'),
  createCategory('edge-sticker', 'エッジステッカー', 'edge', 'sticker'),
  createCategory('corner-sticker', 'コーナーステッカー', 'corner', 'sticker'),
  { id: 'three-cycle', title: '3点交換', problems: [] },
  PARITY_PROBLEM_GROUP,
];

export const TUTORIAL_PROBLEMS: readonly TutorialProblem[] =
  flattenTutorialProblems(TUTORIAL_PROBLEM_GROUPS);

export function flattenTutorialProblems(
  groups: readonly TutorialProblemGroup[],
): readonly TutorialProblem[] {
  return groups.flatMap((group) => [
    ...(group.problems ?? []),
    ...flattenTutorialProblems(group.groups ?? []),
  ]);
}

export function verifyTutorialProblem(problem: TutorialProblem): boolean {
  if (problem.verificationMoves === undefined) return false;
  const cube = Cube.solved();
  const initialState = cube.getState();
  const states: CubeViewState[] = [];
  for (const move of problem.verificationMoves) {
    if (moveViolatesFix(problem, initialState, cube.getState(), move)) {
      return false;
    }
    cube.applyMove(move);
    states.push(cube.getState());
  }
  if (problem.parity !== undefined) {
    return (
      permutationParity(cube.getState(), problem.parity.pieces) ===
      problem.parity.answer
    );
  }
  return evaluateTutorialProgress(problem, initialState, states).solved;
}

function createCategory(
  id: string,
  title: string,
  pieceKind: PieceKind,
  problemKind: ProblemKind,
): TutorialProblemGroup {
  const problems = createProblems(id, pieceKind, problemKind);
  let offset = 0;
  return {
    id,
    title,
    groups: (Object.keys(PROBLEM_CLASS_COUNTS) as ProblemClass[]).map(
      (problemClass) => {
        const count = PROBLEM_CLASS_COUNTS[problemClass];
        const group = {
          id: `${id}-${problemClass}`,
          title: CLASS_TITLES[problemClass],
          problems: problems.slice(offset, offset + count),
        };
        offset += count;
        return group;
      },
    ),
  };
}

interface TrackedCandidate extends TrackedSticker {
  readonly notation: string;
  readonly position: CubiePosition;
}

function createProblems(
  idPrefix: string,
  pieceKind: PieceKind,
  problemKind: ProblemKind,
): readonly TutorialProblem[] {
  const result: TutorialProblem[] = [];
  for (const problemClass of Object.keys(
    PROBLEM_CLASS_COUNTS,
  ) as ProblemClass[]) {
    const count = PROBLEM_CLASS_COUNTS[problemClass];
    const candidates = candidateSequences(problemClass);
    const used = new Set<string>();
    for (const moves of candidates) {
      const states = statesAfterMoves(moves);
      for (const tracked of trackedCandidates(pieceKind, problemKind)) {
        const problem = problemFromWitness(
          `${idPrefix}-${problemClass}-${result.length + 1}`,
          problemKind,
          pieceKind,
          problemClass,
          tracked,
          moves,
          states,
        );
        if (problem === undefined) continue;
        const signature = [
          problem.start,
          problem.goal,
          problem.via,
          problem.fix,
          problem.restore,
        ].join('|');
        if (used.has(signature)) continue;
        used.add(signature);
        result.push(problem);
        break;
      }
      if (used.size === count) break;
    }
    if (used.size !== count) {
      throw new Error(
        `Could not generate ${count} ${idPrefix} ${problemClass} problems`,
      );
    }
  }
  return result;
}

function problemFromWitness(
  id: string,
  problemKind: ProblemKind,
  pieceKind: PieceKind,
  problemClass: ProblemClass,
  tracked: TrackedCandidate,
  moves: readonly CubeMove[],
  states: readonly CubeViewState[],
): TutorialProblem | undefined {
  const finalState = states.at(-1);
  if (finalState === undefined) return undefined;
  const suffix = problemKind === 'position' ? ` ${pieceKind}` : '';
  const start = `${tracked.notation}${suffix}`;
  const finalNotation = notationForTracked(finalState, tracked, problemKind);
  if (finalNotation === undefined) return undefined;
  const goal = `${finalNotation}${suffix}`;
  if (goal === start) return undefined;

  const needsVia = problemClass === 'via' || problemClass === 'combined';
  const needsFix = problemClass === 'fix' || problemClass === 'combined';
  const needsRestore =
    problemClass === 'restore' || problemClass === 'combined';
  const via = needsVia
    ? findVia(states.slice(0, -1), tracked, problemKind, start, goal, suffix)
    : undefined;
  const fix = needsFix
    ? findFixedPiece(moves, states, tracked.cubieId)
    : undefined;
  const restore = needsRestore
    ? findRestoredSticker(states, tracked.cubieId, fix)
    : undefined;
  if (
    (needsVia && via === undefined) ||
    (needsFix && fix === undefined) ||
    (needsRestore && restore === undefined)
  ) {
    return undefined;
  }
  const conditions = [
    via === undefined ? '' : ` via ${via}`,
    fix === undefined ? '' : ` fix ${fix}`,
    restore === undefined ? '' : ` restore ${restore}`,
  ].join('');
  return {
    id,
    title: `${start} -> ${goal}${conditions}`,
    kind: problemKind,
    start,
    goal,
    ...(via === undefined ? {} : { via }),
    ...(fix === undefined ? {} : { fix }),
    ...(restore === undefined ? {} : { restore }),
    verificationMoves: moves,
  };
}

function candidateSequences(
  problemClass: ProblemClass,
): readonly (readonly CubeMove[])[] {
  if (problemClass === 'simple') return OUTER_MOVES.map((move) => [move]);
  const pairs = OUTER_MOVES.flatMap((first) =>
    OUTER_MOVES.filter((second) => second[0] !== first[0]).map(
      (second) => [first, second] as const,
    ),
  );
  if (problemClass === 'via' || problemClass === 'fix') return pairs;
  return pairs.flatMap(([first, second]) => [
    [first, second, invertMove(first)],
    [first, second, invertMove(first), invertMove(second)],
  ]);
}

function statesAfterMoves(
  moves: readonly CubeMove[],
): readonly CubeViewState[] {
  const cube = Cube.solved();
  return moves.map((move) => {
    cube.applyMove(move);
    return cube.getState();
  });
}

function trackedCandidates(
  pieceKind: PieceKind,
  problemKind: ProblemKind,
): readonly TrackedCandidate[] {
  const cubies = createCubieViewModels(Cube.solved().getState()).filter(
    ({ stickers }) =>
      CUBE_FACE_DIRECTIONS.filter((face) => stickers[face] !== undefined)
        .length === (pieceKind === 'corner' ? 3 : 2),
  );
  return cubies.flatMap((cubie) => {
    const faces = positionFaces(cubie.position);
    const trackedFaces = problemKind === 'position' ? faces.slice(0, 1) : faces;
    return trackedFaces.map((face) => ({
      cubieId: cubie.id,
      color: cubie.stickers[face]!,
      notation: stickerNotation(cubie.position, face),
      position: cubie.position,
    }));
  });
}

function notationForTracked(
  state: CubeViewState,
  tracked: TrackedSticker,
  problemKind: ProblemKind,
): string | undefined {
  const cubie = createCubieViewModels(state).find(
    ({ id }) => id === tracked.cubieId,
  );
  if (cubie === undefined) return undefined;
  if (problemKind === 'position') return positionFaces(cubie.position).join('');
  const face = CUBE_FACE_DIRECTIONS.find(
    (candidate) => cubie.stickers[candidate] === tracked.color,
  );
  return face === undefined ? undefined : stickerNotation(cubie.position, face);
}

function findVia(
  states: readonly CubeViewState[],
  tracked: TrackedSticker,
  problemKind: ProblemKind,
  start: string,
  goal: string,
  suffix: string,
): string | undefined {
  return states
    .map((state) => notationForTracked(state, tracked, problemKind))
    .filter((value): value is string => value !== undefined)
    .map((value) => `${value}${suffix}`)
    .find((value) => value !== start && value !== goal);
}

function findFixedPiece(
  moves: readonly CubeMove[],
  states: readonly CubeViewState[],
  trackedCubieId: string,
): string | undefined {
  const initial = Cube.solved().getState();
  return trackedCandidates('edge', 'position')
    .filter(({ cubieId }) => cubieId !== trackedCubieId)
    .map(({ notation }) => `${notation} edge`)
    .find((notation) =>
      moves.every(
        (move, index) =>
          !moveViolatesFix(
            {
              id: '',
              title: '',
              kind: 'position',
              start: notation,
              goal: notation,
              fix: notation,
            },
            initial,
            states[index - 1] ?? initial,
            move,
          ),
      ),
    );
}

function findRestoredSticker(
  states: readonly CubeViewState[],
  trackedCubieId: string,
  fix?: string,
): string | undefined {
  const finalState = states.at(-1);
  if (finalState === undefined) return undefined;
  return trackedCandidates('edge', 'sticker')
    .filter(({ cubieId }) => cubieId !== trackedCubieId)
    .filter(({ notation }) => fix === undefined || !fix.startsWith(notation))
    .find(
      (candidate) =>
        stickerIsAt(finalState, candidate, candidate.notation) &&
        states
          .slice(0, -1)
          .some((state) => !stickerIsAt(state, candidate, candidate.notation)),
    )?.notation;
}

function positionFaces(position: CubiePosition): CubeFaceDirection[] {
  const [x, y, z] = position;
  return [
    ...(y === 1 ? (['U'] as const) : y === -1 ? (['D'] as const) : []),
    ...(x === 1 ? (['R'] as const) : x === -1 ? (['L'] as const) : []),
    ...(z === 1 ? (['F'] as const) : z === -1 ? (['B'] as const) : []),
  ];
}

function stickerNotation(
  position: CubiePosition,
  face: CubeFaceDirection,
): string {
  return [
    face,
    ...positionFaces(position).filter((item) => item !== face),
  ].join('');
}

function invertMove(move: CubeMove): CubeMove {
  if (move.endsWith('2')) return move;
  return move.endsWith("'") ? (move[0] as CubeMove) : (`${move}'` as CubeMove);
}

export function evaluateTutorialProgress(
  problem: TutorialProblem,
  initialState: CubeViewState,
  statesAfterMoves: readonly CubeViewState[],
): TutorialProgress {
  if (problem.kind === 'parity')
    return {
      goalSatisfied: false,
      viaSatisfied: true,
      restoreSatisfied: true,
      solved: false,
    };
  const currentState = statesAfterMoves.at(-1) ?? initialState;
  const tracked = trackedStickerAt(initialState, problem.start);
  const goalSatisfied =
    problem.kind === 'position'
      ? cubieIsAt(currentState, tracked.cubieId, problem.goal)
      : stickerIsAt(currentState, tracked, problem.goal);
  const viaSatisfied =
    problem.via === undefined ||
    statesAfterMoves.some((state) =>
      problem.kind === 'position'
        ? cubieIsAt(state, tracked.cubieId, problem.via as string)
        : stickerIsAt(state, tracked, problem.via as string),
    );
  const restoreSatisfied =
    problem.restore === undefined ||
    stickerIsAt(
      currentState,
      trackedStickerAt(initialState, problem.restore),
      problem.restore,
    );
  return {
    goalSatisfied,
    viaSatisfied,
    restoreSatisfied,
    solved: goalSatisfied && viaSatisfied && restoreSatisfied,
  };
}

export function moveViolatesFix(
  problem: TutorialProblem,
  initialState: CubeViewState,
  currentState: CubeViewState,
  move: CubeMove,
): boolean {
  if (problem.fix === undefined) return false;
  const protectedCubie = trackedStickerAt(initialState, problem.fix);
  const currentCubie = createCubieViewModels(currentState).find(
    ({ id }) => id === protectedCubie.cubieId,
  );
  if (currentCubie === undefined) throw new Error('Fix cubie was not found');
  return isCubieInMoveLayer(currentCubie.position, createMoveAnimation(move));
}

export function trackedStickerMarker(
  initialState: CubeViewState,
  currentState: CubeViewState,
  notation: string,
): { readonly cubieId: string; readonly face: CubeFaceDirection } {
  const tracked = trackedStickerAt(initialState, notation);
  const cubie = createCubieViewModels(currentState).find(
    ({ id }) => id === tracked.cubieId,
  );
  if (cubie === undefined) throw new Error('Tracked cubie was not found');
  const face = CUBE_FACE_DIRECTIONS.find(
    (candidate) => cubie.stickers[candidate] === tracked.color,
  );
  if (face === undefined) throw new Error('Tracked sticker was not found');
  return { cubieId: cubie.id, face };
}

export function trackedPieceView(
  initialState: CubeViewState,
  currentState: CubeViewState,
  notation: string,
): {
  readonly cubieId: string;
  readonly faces: readonly CubeFaceDirection[];
} {
  const tracked = trackedStickerAt(initialState, notation);
  const cubie = createCubieViewModels(currentState).find(
    ({ id }) => id === tracked.cubieId,
  );
  if (cubie === undefined) throw new Error('Tracked cubie was not found');
  return {
    cubieId: cubie.id,
    faces: CUBE_FACE_DIRECTIONS.filter(
      (face) => cubie.stickers[face] !== undefined,
    ),
  };
}

export function stickerLocation(notation: string): {
  readonly position: CubiePosition;
  readonly face: CubeFaceDirection;
} {
  const normalized = notation.split(' ')[0] ?? notation;
  return {
    position: notationPosition(normalized),
    face: normalized[0] as CubeFaceDirection,
  };
}

export function piecePosition(notation: string): CubiePosition {
  return notationPosition(notation.split(' ')[0] ?? notation);
}

function trackedStickerAt(
  state: CubeViewState,
  notation: string,
): TrackedSticker {
  const normalized = notation.split(' ')[0] ?? notation;
  const face = normalized[0] as CubeFaceDirection;
  const position = notationPosition(normalized);
  const cubie = createCubieViewModels(state).find(({ position: candidate }) =>
    samePosition(candidate, position),
  );
  const color = cubie?.stickers[face];
  if (cubie === undefined || color === undefined) {
    throw new Error(`Invalid sticker notation: ${notation}`);
  }
  return { cubieId: cubie.id, color };
}

function stickerIsAt(
  state: CubeViewState,
  tracked: TrackedSticker,
  targetNotation: string,
): boolean {
  const target = targetNotation.split(' ')[0] ?? targetNotation;
  const targetFace = target[0] as CubeFaceDirection;
  const targetPosition = notationPosition(target);
  const cubie = createCubieViewModels(state).find(
    ({ id }) => id === tracked.cubieId,
  );
  return (
    cubie !== undefined &&
    samePosition(cubie.position, targetPosition) &&
    cubie.stickers[targetFace] === tracked.color
  );
}

function cubieIsAt(
  state: CubeViewState,
  cubieId: string,
  targetNotation: string,
): boolean {
  const targetPosition = notationPosition(
    targetNotation.split(' ')[0] ?? targetNotation,
  );
  const cubie = createCubieViewModels(state).find(({ id }) => id === cubieId);
  return cubie !== undefined && samePosition(cubie.position, targetPosition);
}

function notationPosition(notation: string): CubiePosition {
  let x: -1 | 0 | 1 = 0;
  let y: -1 | 0 | 1 = 0;
  let z: -1 | 0 | 1 = 0;
  for (const face of notation) {
    if (face === 'R') x = 1;
    else if (face === 'L') x = -1;
    else if (face === 'U') y = 1;
    else if (face === 'D') y = -1;
    else if (face === 'F') z = 1;
    else if (face === 'B') z = -1;
    else throw new Error(`Invalid face in notation: ${notation}`);
  }
  return [x, y, z];
}

function samePosition(left: CubiePosition, right: CubiePosition): boolean {
  return left.every((value, index) => value === right[index]);
}
