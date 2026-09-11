import type { CubeColorDto } from '@rubiks-learning/api-contract';

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
  readonly start: string;
  readonly goal: string;
  readonly via?: string;
  readonly fix?: string;
  readonly restore?: string;
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

export const TUTORIAL_PROBLEMS: readonly TutorialProblem[] = [
  { id: 'ulf-urb', title: 'ULF -> URB', start: 'ULF', goal: 'URB' },
  { id: 'bdr-urb', title: 'BDR -> URB', start: 'BDR', goal: 'URB' },
  {
    id: 'fld-urb-via-ulf',
    title: 'FLD -> URB via ULF',
    start: 'FLD',
    goal: 'URB',
    via: 'ULF',
  },
  {
    id: 'fld-urb-fix-ub',
    title: 'FLD -> URB fix UB edge',
    start: 'FLD',
    goal: 'URB',
    fix: 'UB',
  },
  {
    id: 'fld-urb-restore-ub',
    title: 'FLD -> URB restore UB',
    start: 'FLD',
    goal: 'URB',
    restore: 'UB',
  },
] as const;

export function evaluateTutorialProgress(
  problem: TutorialProblem,
  initialState: CubeViewState,
  statesAfterMoves: readonly CubeViewState[],
): TutorialProgress {
  const currentState = statesAfterMoves.at(-1) ?? initialState;
  const tracked = trackedStickerAt(initialState, problem.start);
  const goalSatisfied = stickerIsAt(currentState, tracked, problem.goal);
  const viaSatisfied =
    problem.via === undefined ||
    statesAfterMoves.some((state) =>
      stickerIsAt(state, tracked, problem.via as string),
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
