import { Cube, type Move } from '@rubiks-learning/cube-core';
import { describe, expect, it } from 'vitest';

import type { CubeViewState } from '../components/cubeViewModel';
import {
  evaluateTutorialProgress,
  moveViolatesFix,
  TUTORIAL_PROBLEM_GROUPS,
  TUTORIAL_PROBLEMS,
  verifyTutorialProblem,
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

describe('tutorial problem catalog', () => {
  it('UIの最上位6項目を指定順で定義する', () => {
    expect(TUTORIAL_PROBLEM_GROUPS.map(({ title }) => title)).toEqual([
      'エッジ位置',
      'コーナー位置',
      'エッジステッカー',
      'コーナーステッカー',
      '3点交換',
      '偶奇判定',
    ]);
  });

  it.each(TUTORIAL_PROBLEM_GROUPS.slice(0, 4))(
    '$titleにSimple 10、Via 8、Fix 8、Restore 8、Combined 10問を置く',
    (category) => {
      expect(
        category.groups?.map((group) => [group.title, group.problems?.length]),
      ).toEqual([
        ['単純問題', 10],
        ['Via問題', 8],
        ['Fix問題', 8],
        ['Restore問題', 8],
        ['複合問題', 10],
      ]);
    },
  );

  it('合計186問を重複しないIDで定義する', () => {
    expect(TUTORIAL_PROBLEMS).toHaveLength(186);
    expect(new Set(TUTORIAL_PROBLEMS.map(({ id }) => id)).size).toBe(186);
  });

  it('全問題の既知手順がFixに違反せず、Via・Goal・Restoreを満たす', () => {
    const unsolvable = TUTORIAL_PROBLEMS.filter(
      (problem) => !verifyTutorialProblem(problem),
    );
    expect(unsolvable.map(({ id }) => id)).toEqual([]);
  });

  it('各問題種別に必要な条件だけを設定する', () => {
    for (const category of TUTORIAL_PROBLEM_GROUPS.slice(0, 4)) {
      const [simple, via, fix, restore, combined] = category.groups ?? [];
      expect(simple?.problems?.every(noAdditionalCondition)).toBe(true);
      expect(via?.problems?.every((problem) => problem.via !== undefined)).toBe(
        true,
      );
      expect(fix?.problems?.every((problem) => problem.fix !== undefined)).toBe(
        true,
      );
      expect(
        restore?.problems?.every((problem) => problem.restore !== undefined),
      ).toBe(true);
      expect(
        combined?.problems?.every(
          (problem) =>
            problem.via !== undefined &&
            problem.fix !== undefined &&
            problem.restore !== undefined,
        ),
      ).toBe(true);
    }
  });
});

describe('tutorial problem rules', () => {
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

  it('Fix対象を含む層の手だけを拒否する', () => {
    const problem: TutorialProblem = {
      id: 'test-fix',
      title: 'FLD -> URB fix UB edge',
      kind: 'sticker',
      start: 'FLD',
      goal: 'URB',
      fix: 'UB edge',
    };
    const initial = solvedState();
    expect(moveViolatesFix(problem, initial, initial, 'U')).toBe(true);
    expect(moveViolatesFix(problem, initial, initial, 'B2')).toBe(true);
    expect(moveViolatesFix(problem, initial, initial, 'R')).toBe(false);
  });
});

function noAdditionalCondition(problem: TutorialProblem): boolean {
  return (
    problem.via === undefined &&
    problem.fix === undefined &&
    problem.restore === undefined
  );
}
