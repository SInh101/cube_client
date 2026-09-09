import type {
  AnalyzedCubieKindDto,
  CubeColorDto,
  SequenceAnalysisResponseDto,
} from '@rubiks-learning/api-contract';
import type {
  CubeViewMarker,
  CubeViewStickerMarker,
} from '../components/CubeView';
import {
  createCubieViewModels,
  type CubeViewState,
} from '../components/cubeViewModel';

export interface CycleSelection {
  readonly kind: AnalyzedCubieKindDto;
  readonly index: number;
}

export interface CycleVisualization {
  readonly labels: readonly [string, string, string];
  readonly cubieIds: readonly string[];
  readonly markers: readonly CubeViewMarker[];
  readonly stickerCycles: readonly StickerCycleVisualization[];
}

export interface StickerCycleVisualization {
  readonly labels: readonly [string, string, string];
  readonly members: readonly [
    StickerCycleMember,
    StickerCycleMember,
    StickerCycleMember,
  ];
}

export interface StickerCycleMember {
  readonly cubieId: string;
  readonly color: CubeColorDto;
}

export function firstThreeCycle(
  response: SequenceAnalysisResponseDto,
): CycleSelection | undefined {
  if (response.analysis.corners.threeCycles.length > 0) {
    return { kind: 'corner', index: 0 };
  }
  if (response.analysis.edges.threeCycles.length > 0) {
    return { kind: 'edge', index: 0 };
  }
  return undefined;
}

/** RESTの位置ラベルを、3D表示で追跡できる安定したCubie IDへ変換する。 */
export function createCycleVisualization(
  response: SequenceAnalysisResponseDto,
  selection: CycleSelection | undefined,
): CycleVisualization | undefined {
  if (selection === undefined) return undefined;
  const group =
    selection.kind === 'corner'
      ? response.analysis.corners
      : response.analysis.edges;
  const rawLabels = group.threeCycles[selection.index];
  if (rawLabels === undefined) return undefined;
  const labels = normalizeTeachingCycle(rawLabels, selection.kind);
  const entryByLabel = new Map(
    group.permutation.map((entry) => [entry.fromLabel, entry]),
  );
  const cubieIds = labels.flatMap((label) => {
    const entry = entryByLabel.get(label);
    return entry === undefined ? [] : [entry.cubieId];
  });
  if (cubieIds.length !== 3) return undefined;

  return {
    labels,
    cubieIds,
    markers: cubieIds.map((cubieId, index) => ({
      cubieId,
      label: String(index + 1),
    })),
    stickerCycles: createStickerCycles(response, labels, cubieIds),
  };
}

const STICKER_FACE_ORDER = ['U', 'D', 'F', 'B', 'R', 'L'] as const;

/** 選択したsticker cycleの物理ステッカーを、現在向いている面へ配置する。 */
export function createCycleStickerMarkers(
  state: CubeViewState,
  cycle: StickerCycleVisualization | undefined,
): readonly CubeViewStickerMarker[] {
  if (cycle === undefined) return [];
  const currentById = new Map(
    createCubieViewModels(state).map((cubie) => [cubie.id, cubie]),
  );
  return cycle.members.flatMap(({ cubieId, color }, index) => {
    const cubie = currentById.get(cubieId);
    if (cubie === undefined) return [];
    const face = faceHoldingColor(cubie.stickers, color);
    return face === undefined
      ? []
      : [{ cubieId, face, label: String(index + 1) }];
  });
}

function createStickerCycles(
  response: SequenceAnalysisResponseDto,
  positionLabels: readonly [string, string, string],
  cubieIds: readonly string[],
): readonly StickerCycleVisualization[] {
  const beforeById = new Map(
    createCubieViewModels(response.state).map((cubie) => [cubie.id, cubie]),
  );
  const resultByPosition = new Map(
    createCubieViewModels(response.resultState).map((cubie) => [
      cubie.position.join(','),
      cubie,
    ]),
  );
  const entryByLabel = new Map(
    [
      ...response.analysis.corners.permutation,
      ...response.analysis.edges.permutation,
    ].map((entry) => [entry.fromLabel, entry]),
  );
  const first = beforeById.get(cubieIds[0] ?? '');
  if (first === undefined) return [];
  const startingFaces = STICKER_FACE_ORDER.filter(
    (face) => first.stickers[face] !== undefined,
  );

  return startingFaces.flatMap((startingFace) => {
    let face: CubeViewStickerMarker['face'] = startingFace;
    const labels: string[] = [];
    const members: StickerCycleMember[] = [];
    for (let index = 0; index < 3; index += 1) {
      const cubieId = cubieIds[index];
      const positionLabel = positionLabels[index];
      if (cubieId === undefined || positionLabel === undefined) return [];
      const before = beforeById.get(cubieId);
      const color = before?.stickers[face];
      if (before === undefined || color === undefined) return [];
      labels.push(orientedStickerLabel(positionLabel, face));
      members.push({ cubieId, color });
      const entry = entryByLabel.get(positionLabel);
      const resultAtPosition =
        entry === undefined
          ? undefined
          : resultByPosition.get(entry.from.join(','));
      const incomingColor = resultAtPosition?.stickers[face];
      const nextCubieId = cubieIds[(index + 1) % 3];
      const nextBefore =
        nextCubieId === undefined ? undefined : beforeById.get(nextCubieId);
      if (incomingColor === undefined || nextBefore === undefined) return [];
      const nextFace = faceHoldingColor(nextBefore.stickers, incomingColor);
      if (nextFace === undefined) return [];
      face = nextFace;
    }
    if (labels.length !== 3 || members.length !== 3) return [];
    return [
      {
        labels: labels as unknown as [string, string, string],
        members: members as unknown as [
          StickerCycleMember,
          StickerCycleMember,
          StickerCycleMember,
        ],
      },
    ];
  });
}

const POSITION_PRIORITY = {
  corner: ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'],
  edge: [
    'UF',
    'UR',
    'UB',
    'UL',
    'FR',
    'FL',
    'BR',
    'BL',
    'DF',
    'DR',
    'DB',
    'DL',
  ],
} as const;

/** Coreの内部cycle方向を、教材で読むsticker移動方向へ反転して始点を固定する。 */
export function normalizeTeachingCycle(
  labels: readonly [string, string, string],
  kind: AnalyzedCubieKindDto,
): readonly [string, string, string] {
  const reversed = [labels[0], labels[2], labels[1]];
  const priority = POSITION_PRIORITY[kind];
  const start = reversed.reduce((best, label, index) => {
    const rank = (priority as readonly string[]).indexOf(label);
    const bestRank = (priority as readonly string[]).indexOf(
      reversed[best] ?? '',
    );
    return rank >= 0 && (bestRank < 0 || rank < bestRank) ? index : best;
  }, 0);
  return [
    reversed[start] ?? labels[0],
    reversed[(start + 1) % 3] ?? labels[1],
    reversed[(start + 2) % 3] ?? labels[2],
  ];
}

function orientedStickerLabel(positionLabel: string, face: string): string {
  return `${face}${[...positionLabel].filter((value) => value !== face).join('')}`;
}

function faceHoldingColor(
  stickers: ReturnType<typeof createCubieViewModels>[number]['stickers'],
  color: CubeColorDto,
): CubeViewStickerMarker['face'] | undefined {
  return STICKER_FACE_ORDER.find((face) => stickers[face] === color);
}
