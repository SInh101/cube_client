// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToolModeTabs } from './ToolModeTabs';

afterEach(cleanup);

describe('ToolModeTabs', () => {
  it('PracticeとAnalysisをtabとして表示する', () => {
    render(<ToolModeTabs value="practice" onChange={vi.fn()} />);
    expect(
      screen
        .getByRole('tab', { name: 'Practice' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.getByRole('tab', { name: 'Analysis' })).toBeTruthy();
  });

  it('選択したmodeを通知する', () => {
    const onChange = vi.fn();
    render(<ToolModeTabs value="practice" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Analysis' }));
    expect(onChange).toHaveBeenCalledWith('analysis');
  });
});
