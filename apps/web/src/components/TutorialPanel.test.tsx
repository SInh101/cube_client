// @vitest-environment jsdom

import { Cube } from '@rubiks-learning/cube-core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TUTORIAL_PROBLEMS } from '../tutorial/tutorialProblems';
import { TutorialPanel } from './TutorialPanel';

describe('TutorialPanel', () => {
  it('初見の利用者向けに問題記法と全マークの意味を表示する', () => {
    render(
      <TutorialPanel
        problems={TUTORIAL_PROBLEMS}
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
});
