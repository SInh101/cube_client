// @vitest-environment jsdom

import { Cube } from '@rubiks-learning/cube-core';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TUTORIAL_PROBLEM_GROUPS,
  TUTORIAL_PROBLEMS,
} from '../tutorial/tutorialProblems';
import { TutorialPanel } from './TutorialPanel';

afterEach(cleanup);

describe('TutorialPanel', () => {
  it('初見の利用者向けに問題記法と全マークの意味を表示する', () => {
    render(
      <TutorialPanel
        problems={TUTORIAL_PROBLEMS}
        problemGroups={TUTORIAL_PROBLEM_GROUPS}
        activeIndex={0}
        clearedProblemIds={new Set()}
        progress={{
          goalSatisfied: false,
          viaSatisfied: true,
          restoreSatisfied: true,
          solved: false,
        }}
        moveCount={0}
        state={Cube.solved().getState()}
        disabled={false}
        onSelect={vi.fn()}
        onMove={vi.fn()}
        onPreviewChange={vi.fn()}
        onPrevious={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const guide = screen.getByRole('complementary', {
      name: 'How to read the quiz',
    });
    expect(
      within(guide).getByText(/first letter identifies the sticker/i),
    ).toBeTruthy();
    const terms = within(guide)
      .getAllByRole('term')
      .map((term) => term.textContent);
    for (const label of [
      'Tracked',
      'Goal',
      'Via',
      'Fix',
      'Restore',
      'Status',
    ]) {
      expect(terms.some((term) => term?.includes(label))).toBe(true);
    }
    expect(
      within(guide).getByText(/Gray stickers are not being tracked/i),
    ).toBeTruthy();
    expect(
      within(guide).getByText(/changing the View does not turn the cube/i),
    ).toBeTruthy();
  });

  it('5項目を表示し、クリックした項目の問題だけを展開する', () => {
    const onSelect = vi.fn();
    render(
      <TutorialPanel
        problems={TUTORIAL_PROBLEMS}
        problemGroups={TUTORIAL_PROBLEM_GROUPS}
        activeIndex={0}
        clearedProblemIds={new Set()}
        progress={{
          goalSatisfied: false,
          viaSatisfied: true,
          restoreSatisfied: true,
          solved: false,
        }}
        moveCount={0}
        state={Cube.solved().getState()}
        disabled={false}
        onSelect={onSelect}
        onMove={vi.fn()}
        onPreviewChange={vi.fn()}
        onPrevious={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const index = screen.getByRole('navigation', {
      name: 'Tutorial problems',
    });
    const categoryNames = [
      'エッジ位置',
      'コーナー位置',
      'エッジステッカー',
      'コーナーステッカー',
      '3点交換',
    ];
    for (const name of categoryNames) {
      expect(within(index).getByRole('button', { name })).toBeTruthy();
    }
    expect(
      within(index)
        .getByRole('button', { name: 'エッジ位置' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
    expect(within(index).getAllByRole('heading')).toHaveLength(5);

    fireEvent.click(
      within(index).getByRole('button', { name: 'コーナー位置' }),
    );
    expect(onSelect).toHaveBeenCalledWith(44);
    expect(
      within(index)
        .getByRole('button', { name: 'コーナー位置' })
        .getAttribute('aria-expanded'),
    ).toBe('true');

    fireEvent.click(within(index).getByRole('button', { name: '3点交換' }));
    expect(within(index).getByText('問題は今後追加予定です。')).toBeTruthy();
  });
});
