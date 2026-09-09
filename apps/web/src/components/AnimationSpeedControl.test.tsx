// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AnimationSpeedControl,
  MAX_ANIMATION_DURATION_MS,
  MIN_ANIMATION_DURATION_MS,
} from './AnimationSpeedControl';

afterEach(cleanup);

describe('AnimationSpeedControl', () => {
  it('M6-SP-01: sliderと数値入力に同じdurationを表示する', () => {
    render(<AnimationSpeedControl value={730} onChange={() => undefined} />);

    expect(screen.getByLabelText('Animation duration slider')).toHaveProperty(
      'value',
      '730',
    );
    expect(
      screen.getByLabelText('Animation duration in milliseconds'),
    ).toHaveProperty('value', '730');
  });

  it.each([
    ['20', MIN_ANIMATION_DURATION_MS],
    ['2500', MAX_ANIMATION_DURATION_MS],
    ['730', 730],
  ])('M6-SP-02: 入力値%sを範囲内の%imsとして通知する', (input, expected) => {
    const onChange = vi.fn();
    render(<AnimationSpeedControl value={240} onChange={onChange} />);

    fireEvent.change(
      screen.getByLabelText('Animation duration in milliseconds'),
      { target: { value: input } },
    );

    expect(onChange).toHaveBeenCalledWith(expected);
  });
});
