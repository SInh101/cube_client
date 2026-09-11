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
  readonly kind: 'position' | 'sticker';
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
  {
    id: 'ulf-corner-urb-corner',
    title: 'ULF corner -> URB corner',
    kind: 'position',
    start: 'ULF corner',
    goal: 'URB corner',
  },
  {
    id: 'bdr-corner-urb-corner',
    title: 'BDR corner -> URB corner',
    kind: 'position',
    start: 'BDR corner',
    goal: 'URB corner',
  },
  {
    id: 'fld-corner-ulf-corner',
    title: 'FLD corner -> ULF corner',
    kind: 'position',
    start: 'FLD corner',
    goal: 'ULF corner',
  },
  {
    id: 'fld-corner-urb-corner',
    title: 'FLD corner -> URB corner',
    kind: 'position',
    start: 'FLD corner',
    goal: 'URB corner',
  },
  {
    id: 'fld-corner-urb-corner-fix-ub',
    title: 'FLD corner -> URB corner fix UB edge',
    kind: 'position',
    start: 'FLD corner',
    goal: 'URB corner',
    fix: 'UB',
  },
  {
    id: 'ulf-urb',
    title: 'ULF -> URB',
    kind: 'sticker',
    start: 'ULF',
    goal: 'URB',
  },
  {
    id: 'fld-urb-via-ulf',
    title: 'FLD -> URB via ULF',
    kind: 'sticker',
    start: 'FLD',
    goal: 'URB',
    via: 'ULF',
  },
  {
    id: 'bdr-urb',
    title: 'BDR -> URB',
    kind: 'sticker',
    start: 'BDR',
    goal: 'URB',
  },
  {
    id: 'fld-urb-fix-ub',
    title: 'FLD -> URB fix UB edge',
    kind: 'sticker',
    start: 'FLD',
    goal: 'URB',
    fix: 'UB',
  },
  {
    id: 'fld-urb-fix-ub-restore-ur',
    title: 'FLD -> URB fix UB edge restore UR',
    kind: 'sticker',
    start: 'FLD',
    goal: 'URB',
    fix: 'UB',
    restore: 'UR',
  },
  {
    id: 'fld-urb-restore-ub',
    title: 'FLD -> URB restore UB fix RB edge',
    kind: 'sticker',
    start: 'FLD',
    goal: 'URB',
    restore: 'UB',
    fix: 'RB',
  },
] as const;

export function evaluateTutorialProgress(
  problem: TutorialProblem,
  initialState: CubeViewState,
  statesAfterMoves: readonly CubeViewState[],
): TutorialProgress {
  const currentState = statesAfterMoves.at(-1) ?? initialState;
  const tracked = trackedStickerAt(initialState, problem.start);
  const goalSatisfied =
    problem.kind === 'position'
      ? cubieIsAt(currentState, tracked.cubieId, problem.goal)
      : stickerIsAt(currentState, tracked, problem.goal);
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
