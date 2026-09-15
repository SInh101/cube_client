import { Cube, type Move } from '@rubiks-learning/cube-core';
import { describe, expect, it } from 'vitest';

import type { CubeViewState } from '../components/cubeViewModel';
import {
  evaluateTutorialProgress,
  moveViolatesFix,
  TUTORIAL_PROBLEM_GROUPS,
  TUTORIAL_PROBLEMS,
  type TutorialProblem,
} from './tutorialProblems';

const solvedState = (): CubeViewState => Cube.solved().getState();

function statesAfter(...moves: Move[]): readonly CubeViewState[] {
  const cube = Cube.solved();
  return moves.map((move) => {
    cube.applyMove(move);
    return cube.getState();
  });
}

function problem(id: string): TutorialProblem {
  const result = TUTORIAL_PROBLEMS.find((candidate) => candidate.id === id);
  if (result === undefined) throw new Error(`Missing tutorial problem: ${id}`);
  return result;
}

describe('tutorial problem rules', () => {
  it('Single targetをCornerのPositionとStickerへ階層化する', () => {
    expect(TUTORIAL_PROBLEM_GROUPS).toMatchObject([
      {
        id: 'single-target',
        groups: [
          {
            id: 'corner',
            groups: [{ id: 'corner-position' }, { id: 'corner-sticker' }],
          },
        ],
      },
    ]);
    expect(TUTORIAL_PROBLEMS).toHaveLength(11);
  });

  it('ULFのUステッカーがURBのU面へ着いたときGoalを満たす', () => {
    const progress = evaluateTutorialProgress(
      problem('ulf-urb'),
      solvedState(),
      statesAfter('U2'),
    );
    expect(progress.solved).toBe(true);
  });

  it('BDRのBステッカーをURBのU面へ向ける条件を判定する', () => {
    const progress = evaluateTutorialProgress(
      problem('bdr-urb'),
      solvedState(),
      statesAfter("R'"),
    );
    expect(progress.solved).toBe(true);
  });

  it('Viaは追跡ステッカーの位置と向きを判定する', () => {
    const progress = evaluateTutorialProgress(
      problem('fld-urb-via-ulf'),
      solvedState(),
      statesAfter("L'", 'U2'),
    );
    expect(progress.viaSatisfied).toBe(true);
    expect(progress.solved).toBe(true);
  });

  it('Previous相当でVia通過stateが消えると未成立へ戻る', () => {
    const progress = evaluateTutorialProgress(
      problem('fld-urb-via-ulf'),
      solvedState(),
      [],
    );
    expect(progress.viaSatisfied).toBe(false);
  });

  it('Fix対象のUB edgeを含むface・slice手だけを拒否する', () => {
    const fixProblem = problem('fld-urb-fix-ub');
    const initial = solvedState();
    expect(moveViolatesFix(fixProblem, initial, initial, 'U')).toBe(true);
    expect(moveViolatesFix(fixProblem, initial, initial, 'B2')).toBe(true);
    expect(moveViolatesFix(fixProblem, initial, initial, "M'")).toBe(true);
    expect(moveViolatesFix(fixProblem, initial, initial, 'R')).toBe(false);
    expect(moveViolatesFix(fixProblem, initial, initial, 'L')).toBe(false);
  });

  it('RestoreはGoal時点の位置と向きを要求する', () => {
    const progress = evaluateTutorialProgress(
      problem('fld-urb-restore-ub'),
      solvedState(),
      statesAfter("L'", 'U2'),
    );
    expect(progress.goalSatisfied).toBe(true);
    expect(progress.restoreSatisfied).toBe(false);
    expect(progress.solved).toBe(false);
  });

  it('Restore問題ではRB edgeをFixする', () => {
    const restoreProblem = problem('fld-urb-restore-ub');
    const initial = solvedState();
    expect(restoreProblem.fix).toBe('RB');
    expect(moveViolatesFix(restoreProblem, initial, initial, 'R')).toBe(true);
    expect(moveViolatesFix(restoreProblem, initial, initial, "B'")).toBe(true);
    expect(moveViolatesFix(restoreProblem, initial, initial, 'E2')).toBe(true);
    expect(moveViolatesFix(restoreProblem, initial, initial, 'U')).toBe(false);
  });

  it('Position問題はパーツの向きを問わない', () => {
    const positionProblem: TutorialProblem = {
      id: 'test-position',
      title: 'ULF corner -> URF corner',
      kind: 'position',
      start: 'ULF corner',
      goal: 'URF corner',
    };
    const stickerProblem: TutorialProblem = {
      ...positionProblem,
      id: 'test-sticker',
      title: 'ULF -> URF',
      kind: 'sticker',
      start: 'ULF',
      goal: 'URF',
    };
    const states = statesAfter('F');
    expect(
      evaluateTutorialProgress(positionProblem, solvedState(), states).solved,
    ).toBe(true);
    expect(
      evaluateTutorialProgress(stickerProblem, solvedState(), states).solved,
    ).toBe(false);
  });

  it('最初に4問のPosition問題とFix付きPosition問題を並べる', () => {
    expect(
      TUTORIAL_PROBLEMS.slice(0, 4).every(({ kind }) => kind === 'position'),
    ).toBe(true);
    expect(TUTORIAL_PROBLEMS[4]).toMatchObject({
      kind: 'position',
      fix: 'UB',
    });
  });

  it('Fix UBの次にRestore UR付き問題を配置する', () => {
    const fixIndex = TUTORIAL_PROBLEMS.findIndex(
      ({ id }) => id === 'fld-urb-fix-ub',
    );
    expect(TUTORIAL_PROBLEMS[fixIndex + 1]).toMatchObject({
      id: 'fld-urb-fix-ub-restore-ur',
      fix: 'UB',
      restore: 'UR',
    });
  });
});
