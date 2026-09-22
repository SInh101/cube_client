// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Cube } from '@rubiks-learning/cube-core';
import { App } from './App';
import type { CubeViewProps } from './components/CubeView';
import { useCubeColorScheme } from './components/CubeColorSchemeContext';

vi.mock('./components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./components')>()),
  PresetPanel: () => null,
  CubeView: function TestCubeView({ state, freeCamera }: CubeViewProps) {
    const { colorMap } = useCubeColorScheme();
    return (
      <>
        <output data-testid="logical-board">{JSON.stringify(state)}</output>
        <output data-testid="display-colors">{JSON.stringify(colorMap)}</output>
        <output data-testid="free-camera">{String(freeCamera)}</output>
      </>
    );
  },
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function setup() {
  const state = Cube.solved().getState();
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ cubeId: 'orientation-test', state }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return { ...render(<App />), fetchMock };
}

it('shares U/F colors across all tabs, manual controls, and the 3BLD net without changing the board or camera mode', async () => {
  const { fetchMock } = setup();
  const up = await screen.findByLabelText('U面の色');
  const board = screen.getByTestId('logical-board').textContent;
  const requests = fetchMock.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'フリーカメラ OFF' }));
  fireEvent.change(up, { target: { value: 'yellow' } });
  fireEvent.change(screen.getByLabelText('F面の色'), {
    target: { value: 'red' },
  });
  expect(screen.getByTestId('logical-board').textContent).toBe(board);
  expect(fetchMock).toHaveBeenCalledTimes(requests);
  expect(screen.getByTestId('free-camera').textContent).toBe('true');
  expect(
    JSON.parse(screen.getByTestId('display-colors').textContent!).white,
  ).toBe('yellow');
  expect(
    JSON.parse(screen.getByTestId('display-colors').textContent!).green,
  ).toBe('red');
  const expectManualColor = () => {
    const stickers = screen
      .getByRole('region', { name: 'U face' })
      .querySelectorAll<HTMLElement>('.face-control__sticker');
    expect(stickers).toHaveLength(9);
    expect(stickers[4]!.style.getPropertyValue('--sticker-color')).toBe(
      '#facc15',
    );
  };
  expectManualColor();
  for (const tab of ['Analysis', 'Tutorial', '3BLD', 'Practice']) {
    fireEvent.click(screen.getByRole('tab', { name: tab }));
    await waitFor(() =>
      expect(screen.getByLabelText('U面の色')).toHaveProperty(
        'value',
        'yellow',
      ),
    );
    expect(screen.getByLabelText('F面の色')).toHaveProperty('value', 'red');
    if (tab === '3BLD') {
      const net = screen.getByLabelText('文字割り当ての展開図');
      const center = within(net)
        .getByLabelText('U面')
        .querySelector<HTMLElement>('.blindfold-center');
      expect(center!.style.backgroundColor).toBe('rgb(250, 204, 21)');
    } else {
      await waitFor(expectManualColor);
    }
  }
});

it('keeps F adjacent when U changes, persists the preference, and restores the standard scheme', async () => {
  const app = setup();
  fireEvent.change(await screen.findByLabelText('U面の色'), {
    target: { value: 'green' },
  });
  const front = screen.getByLabelText('F面の色') as HTMLSelectElement;
  expect(front.options).toHaveLength(4);
  expect(Array.from(front.options, (o) => o.value)).not.toContain('blue');
  expect(Array.from(front.options, (o) => o.value)).not.toContain('green');
  expect(front.value).toBe('white');
  app.unmount();
  setup();
  expect(await screen.findByLabelText('U面の色')).toHaveProperty(
    'value',
    'green',
  );
  fireEvent.click(screen.getByRole('button', { name: '標準の配色に戻す' }));
  expect(screen.getByLabelText('U面の色')).toHaveProperty('value', 'white');
  expect(screen.getByLabelText('F面の色')).toHaveProperty('value', 'green');
});

it('falls back to the standard scheme for invalid saved colors', async () => {
  localStorage.setItem(
    'cube-learning.orientation.v1',
    JSON.stringify({ up: 'white', front: 'yellow' }),
  );
  setup();
  expect(await screen.findByLabelText('U面の色')).toHaveProperty(
    'value',
    'white',
  );
  expect(screen.getByLabelText('F面の色')).toHaveProperty('value', 'green');
});
