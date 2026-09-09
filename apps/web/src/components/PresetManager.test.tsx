// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PresetResponseDto } from '@rubiks-learning/api-contract';
import { PresetManager } from './PresetManager';
const preset: PresetResponseDto = {
  id: '00000000-0000-4000-8000-000000000010',
  name: 'Sexy Move',
  moves: "R U R' U'",
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};
afterEach(cleanup);
describe('Milestone 10 PresetManager', () => {
  it('M10-UI-01〜05: 一覧、登録、名前・手順更新、削除を通知する', () => {
    const handlers = createHandlers();
    render(<PresetManager presets={[preset]} status="ready" {...handlers} />);
    expect(screen.getByDisplayValue('Sexy Move')).toBeTruthy();
    fireEvent.change(screen.getAllByLabelText(/^Name$/u)[0]!, {
      target: { value: 'New' },
    });
    fireEvent.change(screen.getAllByLabelText(/^Moves$/u)[0]!, {
      target: { value: 'R2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    expect(handlers.onCreate).toHaveBeenCalledWith({
      name: 'New',
      moves: 'R2',
    });
    fireEvent.change(screen.getByLabelText('Name Sexy Move'), {
      target: { value: 'Renamed' },
    });
    fireEvent.change(screen.getByLabelText('Moves Sexy Move'), {
      target: { value: 'U' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(handlers.onUpdate).toHaveBeenCalledWith(preset.id, {
      name: 'Renamed',
      moves: 'U',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(handlers.onDelete).toHaveBeenCalledWith(preset.id);
  });
  it('M10-UI-06〜07: 通常・逆再生を通知する', () => {
    const handlers = createHandlers();
    render(<PresetManager presets={[preset]} status="ready" {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reverse Play' }));
    expect(handlers.onPlay).toHaveBeenCalledWith(preset);
    expect(handlers.onReversePlay).toHaveBeenCalledWith(preset);
  });
  it('M10-UI-08: loading、error、空一覧を表示する', () => {
    const handlers = createHandlers();
    const { rerender } = render(
      <PresetManager presets={[]} status="loading" {...handlers} />,
    );
    expect(screen.getByText('Loading presets…')).toBeTruthy();
    rerender(
      <PresetManager
        presets={[]}
        status="error"
        error="Could not load presets."
        {...handlers}
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not load presets.',
    );
    expect(screen.getByText('No presets yet.')).toBeTruthy();
  });
});
function createHandlers() {
  return {
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onPlay: vi.fn(),
    onReversePlay: vi.fn(),
  };
}
