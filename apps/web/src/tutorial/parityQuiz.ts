import { Cube } from '@rubiks-learning/cube-core';
import {
  createCubieViewModels,
  type CubeMove,
  type CubeViewState,
} from '../components/cubeViewModel';
import type { TutorialProblemGroup } from './tutorialProblems';

export type Parity = 'even' | 'odd';
export interface ParityQuizConfig {
  readonly pieces: 'edge' | 'corner';
  readonly mode: 'fixed' | 'random';
  readonly scramble: readonly CubeMove[];
  readonly answer: Parity;
}
export function permutationParity(
  state: CubeViewState,
  pieces: ParityQuizConfig['pieces'],
): Parity {
  const count = pieces === 'edge' ? 2 : 3;
  const select = (value: CubeViewState) =>
    createCubieViewModels(value).filter(
      (cubie) =>
        Object.values(cubie.stickers).filter((color) => color !== undefined)
          .length === count,
    );
  const home = select(Cube.solved().getState()).map(({ id }) => id);
  const permutation = select(state).map(({ id }) => home.indexOf(id));
  let inversions = 0;
  for (let i = 0; i < permutation.length; i++) {
    for (let j = i + 1; j < permutation.length; j++) {
      if (permutation[i]! > permutation[j]!) inversions++;
    }
  }
  return inversions % 2 === 0 ? 'even' : 'odd';
}
export function scrambledState(moves: readonly CubeMove[]): CubeViewState {
  const cube = Cube.solved();
  for (const move of moves) cube.applyMove(move);
  return cube.getState();
}
export function randomParityScramble(
  random: () => number = Math.random,
): readonly CubeMove[] {
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'] as const;
  const moves: CubeMove[] = [];
  for (let i = 0; i < 20; i++) {
    const candidates = faces.filter((face) => face !== moves.at(-1)?.[0]);
    const face = candidates[Math.floor(random() * candidates.length)]!;
    const suffix = ['', "'", '2'][Math.floor(random() * 3)]!;
    moves.push(`${face}${suffix}` as CubeMove);
  }
  // Choose either parity with equal probability, independently of scramble length.
  const target: Parity = random() < 0.5 ? 'even' : 'odd';
  if (permutationParity(scrambledState(moves), 'corner') !== target)
    moves.push('U');
  return moves;
}
export const PARITY_PROBLEM_GROUP: TutorialProblemGroup = {
  id: 'parity',
  title: '偶奇判定',
  groups: (['edge', 'corner'] as const).map((pieces) => {
    const label = pieces === 'edge' ? 'エッジ' : 'コーナー';
    const definitions: readonly {
      mode: 'fixed' | 'random';
      scramble: readonly CubeMove[];
      answer: Parity;
    }[] = [
      { mode: 'fixed', scramble: ['R'], answer: 'odd' },
      { mode: 'fixed', scramble: ['R2'], answer: 'even' },
      { mode: 'fixed', scramble: ['R', 'U', "F'", 'L2'], answer: 'odd' },
      { mode: 'fixed', scramble: ['R', 'U', "R'", "U'"], answer: 'even' },
      { mode: 'random', scramble: ['F', 'R2', 'U'], answer: 'even' },
    ];
    return {
      id: `parity-${pieces}`,
      title: `${label}の偶奇`,
      problems: definitions.map((definition, index) => ({
        id: `parity-${pieces}-${index + 1}`,
        title: `${label}：${definition.mode === 'random' ? 'ランダム練習' : `固定問題 ${index + 1}`}`,
        kind: 'parity',
        start: 'シャッフル後の状態',
        goal: '位置の置換の偶奇を判定',
        parity: { ...definition, pieces },
        verificationMoves: definition.scramble,
      })),
    };
  }),
};

export interface ParitySession {
  readonly state: CubeViewState;
  readonly question: number;
  readonly attempts: number;
  readonly correct: number;
  readonly feedback?: string;
}
export function startParitySession(config: ParityQuizConfig): ParitySession {
  return {
    state: scrambledState(
      config.mode === 'random' ? randomParityScramble() : config.scramble,
    ),
    question: 1,
    attempts: 0,
    correct: 0,
  };
}
export function answerParitySession(
  session: ParitySession,
  config: ParityQuizConfig,
  answer: Parity,
): ParitySession {
  const expected = permutationParity(session.state, config.pieces);
  const correct = answer === expected;
  return {
    state:
      config.mode === 'random'
        ? scrambledState(randomParityScramble())
        : session.state,
    question: session.question + (config.mode === 'random' ? 1 : 0),
    attempts: session.attempts + 1,
    correct: session.correct + Number(correct),
    feedback: `${config.mode === 'random' ? `第${session.question}問：` : ''}${correct ? '正解！' : '不正解。'} 正答は${expected === 'even' ? '偶置換' : '奇置換'}です。`,
  };
}
