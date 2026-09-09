import { describe, expect, it } from 'vitest';

import {
  createMoveAnimation,
  isCubieInMoveLayer,
  previewRotationAt,
  type CubeMove,
  type CubiePosition,
} from './cubeViewModel';

describe('Cube move animation', () => {
  it.each([
    ['R', 'x', 1],
    ['L', 'x', -1],
    ['U', 'y', 1],
    ['D', 'y', -1],
    ['F', 'z', 1],
    ['B', 'z', -1],
    ['M', 'x', 0],
    ['E', 'y', 0],
    ['S', 'z', 0],
  ] as const)('M6-AN-01: %sは%s軸のlayer %iを回転する', (move, axis, layer) => {
    const animation = createMoveAnimation(move);
    const position = positionOn(axis, layer);

    expect(animation).toMatchObject({ axis, layer });
    expect(isCubieInMoveLayer(position, animation)).toBe(true);
  });

  it.each(['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S'] as const)(
    "M6-AN-02: %s'は%sと反対方向へ回転する",
    (move) => {
      expect(createMoveAnimation(`${move}'`).angle).toBe(
        -createMoveAnimation(move).angle,
      );
    },
  );

  it.each(['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S'] as const)(
    'M6-AN-03: %s2は半回転する',
    (move) => {
      expect(Math.abs(createMoveAnimation(`${move}2` as CubeMove).angle)).toBe(
        Math.PI,
      );
    },
  );

  it.each([Math.PI / 12, -Math.PI / 12])(
    'M6-AN-04: Ghostは正位置から指定方向へだけ進み、周期末にリセットする (%f)',
    (targetAngle) => {
      expect(previewRotationAt(targetAngle, 0)).toBeCloseTo(0);
      expect(Math.abs(previewRotationAt(targetAngle, 719))).toBeGreaterThan(
        Math.abs(previewRotationAt(targetAngle, 360)),
      );
      expect(previewRotationAt(targetAngle, 720)).toBeCloseTo(0);

      for (const elapsed of [90, 180, 270, 450, 540, 630]) {
        expect(Math.sign(previewRotationAt(targetAngle, elapsed))).toBe(
          Math.sign(targetAngle),
        );
      }
    },
  );
});

function positionOn(axis: 'x' | 'y' | 'z', layer: -1 | 0 | 1): CubiePosition {
  if (axis === 'x') return [layer, 0, 0];
  if (axis === 'y') return [0, layer, 0];
  return [0, 0, layer];
}
