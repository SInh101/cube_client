import { describe, expect, it } from 'vitest';
import {
  CUBE_COLORS,
  createColorMap,
  DEFAULT_ORIENTATION,
  frontColors,
  isCubeOrientation,
} from './cubeColorScheme';

describe('cube color orientations', () => {
  it('keeps the standard scheme and rotates the side colors with U and F', () => {
    const standard = createColorMap(DEFAULT_ORIENTATION);
    for (const color of CUBE_COLORS) expect(standard[color]).toBe(color);
    expect(createColorMap({ up: 'yellow', front: 'green' })).toEqual({
      white: 'yellow',
      yellow: 'white',
      green: 'green',
      blue: 'blue',
      red: 'orange',
      orange: 'red',
    });
    expect(createColorMap({ up: 'white', front: 'red' })).toEqual({
      white: 'white',
      yellow: 'yellow',
      green: 'red',
      blue: 'orange',
      red: 'blue',
      orange: 'green',
    });
  });

  it('offers exactly the 24 physical orientations without reflections', () => {
    // Independently enumerate rigid rotations by their color permutations.
    const standard = createColorMap(DEFAULT_ORIENTATION);
    const seen = new Set<string>();
    const queue = [standard];
    while (queue.length) {
      const p = queue.shift()!;
      const key = CUBE_COLORS.map((c) => p[c]).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(
        {
          white: p.green,
          green: p.yellow,
          yellow: p.blue,
          blue: p.white,
          red: p.red,
          orange: p.orange,
        },
        {
          white: p.white,
          yellow: p.yellow,
          green: p.red,
          red: p.blue,
          blue: p.orange,
          orange: p.green,
        },
      );
    }
    expect(seen.size).toBe(24);
    const generated = new Set<string>();
    for (const up of CUBE_COLORS) {
      expect(frontColors(up)).toHaveLength(4);
      for (const front of frontColors(up)) {
        const map = createColorMap({ up, front });
        generated.add(CUBE_COLORS.map((c) => map[c]).join(','));
      }
    }
    expect(generated).toEqual(seen);
  });

  it('rejects identical, opposite, or invalid colors', () => {
    for (const value of [
      null,
      {},
      { up: 'white', front: 'white' },
      { up: 'white', front: 'yellow' },
      { up: 'purple', front: 'green' },
    ]) {
      expect(isCubeOrientation(value)).toBe(false);
    }
    expect(() => createColorMap({ up: 'white', front: 'yellow' })).toThrow();
  });
});
