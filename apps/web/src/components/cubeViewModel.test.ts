import type { CubeColorDto, FaceStateDto } from '@rubiks-learning/api-contract';
import { describe, expect, it } from 'vitest';

import {
  createCubieViewModels,
  findChangedCubieIds,
  type CubeViewState,
} from './cubeViewModel';

describe('createCubieViewModels', () => {
  it('M5-01: 3D表示に必要な26個のcubieを生成する', () => {
    expect(createCubieViewModels(solvedState())).toHaveLength(26);
  });

  it('M5-02: solved stateの各色を外側の9面へ割り当てる', () => {
    const stickers = createCubieViewModels(solvedState()).flatMap((cubie) =>
      Object.values(cubie.stickers).filter(
        (sticker): sticker is CubeColorDto => sticker !== undefined,
      ),
    );

    expect(stickers).toHaveLength(54);
    for (const color of ['white', 'red', 'green', 'yellow', 'orange', 'blue']) {
      expect(stickers.filter((sticker) => sticker === color)).toHaveLength(9);
    }
  });

  it('M5-03: face配列の位置を対応する外向き面へ割り当てる', () => {
    const state = solvedState();
    const markedState: CubeViewState = {
      faces: {
        ...state.faces,
        F: ['blue', ...state.faces.F.slice(1)] as unknown as FaceStateDto,
      },
    };

    const frontTopLeft = createCubieViewModels(markedState).find(
      ({ position }) =>
        position[0] === -1 && position[1] === 1 && position[2] === 1,
    );

    expect(frontTopLeft?.stickers.F).toBe('blue');
  });

  it('M12-3D-01: sticker色から向きに依存しないcubie IDを作る', () => {
    const frontTopRight = createCubieViewModels(solvedState()).find(
      ({ position }) =>
        position[0] === 1 && position[1] === 1 && position[2] === 1,
    );
    expect(frontTopRight?.id).toBe('green-red-white');
  });

  it('M12-3D-02: 同一stateでは強調対象を返さない', () => {
    const state = solvedState();
    expect(findChangedCubieIds(state, state)).toEqual([]);
  });

  it('M12-3D-03: stickerが変化した現在側のCubie IDを重複なく返す', () => {
    const before = solvedState();
    const after: CubeViewState = {
      faces: {
        ...before.faces,
        F: ['blue', ...before.faces.F.slice(1)] as unknown as FaceStateDto,
      },
    };
    const changed = findChangedCubieIds(before, after);
    expect(new Set(changed).size).toBe(changed.length);
    expect(changed.length).toBeGreaterThan(0);
  });
});

function solvedState(): CubeViewState {
  return {
    faces: {
      U: face('white'),
      R: face('red'),
      F: face('green'),
      D: face('yellow'),
      L: face('orange'),
      B: face('blue'),
    },
  };
}

function face(color: CubeColorDto): FaceStateDto {
  return Array<CubeColorDto>(9).fill(color) as unknown as FaceStateDto;
}
