// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SliceControlPanel } from './SliceControlPanel';

afterEach(cleanup);

describe('SliceControlPanel', () => {
  it('offers quarter, inverse, and double turns for M, E, and S', () => {
    const onMove = vi.fn();
    render(<SliceControlPanel onMove={onMove} />);

    for (const move of ['M', "M'", 'M2', 'E', "E'", 'E2', 'S', "S'", 'S2']) {
      fireEvent.click(screen.getByRole('button', { name: move }));
    }

    expect(onMove.mock.calls.map(([move]) => move)).toEqual([
      'M',
      "M'",
      'M2',
      'E',
      "E'",
      'E2',
      'S',
      "S'",
      'S2',
    ]);
  });
});
