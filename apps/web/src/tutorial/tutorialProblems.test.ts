import { Cube, type Move } from '@rubiks-learning/cube-core';
import { describe, expect, it } from 'vitest';

import type { CubeViewState } from '../components/cubeViewModel';
import {
  evaluateTutorialProgress,
  moveViolatesFix,
  TUTORIAL_PROBLEMS,
} from './tutorialProblems';

const solvedState = (): CubeViewState => Cube.solved().getState();

function statesAfter(...moves: Move[]): readonly CubeViewState[] {
  const cube = Cube.solved();
  return moves.map((move) => {
    cube.applyMove(move);
    return cube.getState();
  });
}

describe('tutorial problem rules', () => {
  it('ULFのUステッカーがURBのU面へ着いたときGoalを満たす', () => {
    const progress = evaluateTutorialProgress(
      TUTORIAL_PROBLEMS[0]!,
      solvedState(),
      statesAfter('U2'),
    );
    expect(progress.solved).toBe(true);
  });

  it('BDRのBステッカーをURBのU面へ向ける条件を判定する', () => {
    const progress = evaluateTutorialProgress(
      TUTORIAL_PROBLEMS[2]!,
      solvedState(),
      statesAfter("R'"),
    );
    expect(progress.solved).toBe(true);
  });

  it('Viaは追跡ステッカーの位置と向きを判定する', () => {
    const progress = evaluateTutorialProgress(
      TUTORIAL_PROBLEMS[1]!,
      solvedState(),
      statesAfter("L'", 'U2'),
    );
    expect(progress.viaSatisfied).toBe(true);
    expect(progress.solved).toBe(true);
  });

  it('Previous相当でVia通過stateが消えると未成立へ戻る', () => {
    const progress = evaluateTutorialProgress(
      TUTORIAL_PROBLEMS[1]!,
      solvedState(),
      [],
    );
    expect(progress.viaSatisfied).toBe(false);
  });

  it('Fix対象のUB edgeを含むface・slice手だけを拒否する', () => {
    const problem = TUTORIAL_PROBLEMS[3]!;
    const initial = solvedState();
    expect(moveViolatesFix(problem, initial, initial, 'U')).toBe(true);
    expect(moveViolatesFix(problem, initial, initial, 'B2')).toBe(true);
    expect(moveViolatesFix(problem, initial, initial, "M'")).toBe(true);
    expect(moveViolatesFix(problem, initial, initial, 'R')).toBe(false);
    expect(moveViolatesFix(problem, initial, initial, 'L')).toBe(false);
  });

  it('RestoreはGoal時点の位置と向きを要求する', () => {
    const progress = evaluateTutorialProgress(
      TUTORIAL_PROBLEMS[4]!,
      solvedState(),
      statesAfter("L'", 'U2'),
    );
    expect(progress.goalSatisfied).toBe(true);
    expect(progress.restoreSatisfied).toBe(false);
    expect(progress.solved).toBe(false);
  });

  it('Restore問題ではRB edgeをFixする', () => {
    const problem = TUTORIAL_PROBLEMS[4]!;
    const initial = solvedState();
    expect(problem.fix).toBe('RB');
    expect(moveViolatesFix(problem, initial, initial, 'R')).toBe(true);
    expect(moveViolatesFix(problem, initial, initial, "B'")).toBe(true);
    expect(moveViolatesFix(problem, initial, initial, 'E2')).toBe(true);
    expect(moveViolatesFix(problem, initial, initial, 'U')).toBe(false);
  });
});
