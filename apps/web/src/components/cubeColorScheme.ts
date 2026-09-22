import type { CubeColorDto } from '@rubiks-learning/api-contract';

export interface CubeOrientation {
  readonly up: CubeColorDto;
  readonly front: CubeColorDto;
}

export const CUBE_COLORS: readonly CubeColorDto[] = [
  'white',
  'yellow',
  'red',
  'orange',
  'green',
  'blue',
];
export const COLOR_NAMES: Readonly<Record<CubeColorDto, string>> = {
  white: '白',
  yellow: '黄',
  red: '赤',
  orange: 'オレンジ',
  green: '緑',
  blue: '青',
};
export const STICKER_COLORS: Readonly<Record<CubeColorDto, string>> = {
  white: '#f8fafc',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#facc15',
  orange: '#f97316',
  blue: '#2563eb',
};
export const DEFAULT_ORIENTATION: CubeOrientation = {
  up: 'white',
  front: 'green',
};
const NORMALS: Readonly<
  Record<CubeColorDto, readonly [number, number, number]>
> = {
  white: [0, 1, 0],
  yellow: [0, -1, 0],
  red: [1, 0, 0],
  orange: [-1, 0, 0],
  green: [0, 0, 1],
  blue: [0, 0, -1],
};
const OPPOSITE: Readonly<Record<CubeColorDto, CubeColorDto>> = {
  white: 'yellow',
  yellow: 'white',
  red: 'orange',
  orange: 'red',
  green: 'blue',
  blue: 'green',
};

export function frontColors(up: CubeColorDto): readonly CubeColorDto[] {
  return CUBE_COLORS.filter((color) => color !== up && color !== OPPOSITE[up]);
}

export function isCubeOrientation(value: unknown): value is CubeOrientation {
  if (!value || typeof value !== 'object') return false;
  const { up, front } = value as Partial<CubeOrientation>;
  return (
    up !== undefined &&
    front !== undefined &&
    CUBE_COLORS.includes(up) &&
    frontColors(up).includes(front)
  );
}

/** Map logical sticker identities to a rotated, never mirrored, color scheme. */
export function createColorMap(
  orientation: CubeOrientation,
): Readonly<Record<CubeColorDto, CubeColorDto>> {
  if (!isCubeOrientation(orientation))
    throw new Error('U and F must be adjacent colors');
  const { up, front } = orientation;
  const [ux, uy, uz] = NORMALS[up];
  const [fx, fy, fz] = NORMALS[front];
  // In the original cube, the right face is U cross F.
  const rightNormal = [uy * fz - uz * fy, uz * fx - ux * fz, ux * fy - uy * fx];
  const right = CUBE_COLORS.find((color) =>
    NORMALS[color].every((n, i) => n === rightNormal[i]),
  )!;
  return {
    white: up,
    yellow: OPPOSITE[up],
    green: front,
    blue: OPPOSITE[front],
    red: right,
    orange: OPPOSITE[right],
  };
}
