import type {
  CubePermutationAnalysisDto,
  OrientationChangeDto,
  PermutationEntryDto,
  PieceAnalysisDto,
  SequenceAnalysisResponseDto,
} from '@rubiks-learning/api-contract';
import {
  analyzePermutation,
  conjugateSequence,
  invertSequence,
  parseSequence,
  InvalidMoveSequenceError,
  type Cube,
  type MoveSequence,
  type CubieKind,
  type OrientationChange,
  type PermutationAnalysis,
  type PermutationEntry,
} from '@rubiks-learning/cube-core';

import { cubeRepository } from '../repository/sharedCubeRepository.js';
import { CubeNotFoundError } from './CubeNotFoundError.js';
import { ConjugateInputError } from './ConjugateInputError.js';

/** 保存済みCubeを変更せず、指定sequence後のpermutationを解析する。 */
export async function analyzeCubeSequence(
  cubeId: string,
  sequenceSource: string,
  conjugateSource?: string,
): Promise<SequenceAnalysisResponseDto> {
  const sequence = parseSequence(sequenceSource);
  let setup: MoveSequence | undefined;
  try {
    setup =
      conjugateSource === undefined || conjugateSource.trim() === ''
        ? undefined
        : parseSequence(conjugateSource);
  } catch (error: unknown) {
    if (error instanceof InvalidMoveSequenceError) {
      throw new ConjugateInputError(error);
    }
    throw error;
  }
  const cube = await cubeRepository.findById(cubeId);
  if (cube === undefined) throw new CubeNotFoundError(cubeId);

  const before = cube.getState();
  const effectiveSequence =
    setup === undefined ? sequence : conjugateSequence(setup, sequence);
  const simulated = simulate(cube, effectiveSequence);
  const resultState = simulated.getState();
  const analysis = toCubeAnalysis(analyzePermutation(before, resultState));
  const baseAnalysis =
    setup === undefined
      ? undefined
      : toCubeAnalysis(
          analyzePermutation(before, simulate(cube, sequence).getState()),
        );

  return {
    cubeId,
    state: before,
    sequence: effectiveSequence.toString(),
    moves: effectiveSequence.moves,
    resultState,
    analysis,
    ...(setup === undefined || baseAnalysis === undefined
      ? {}
      : {
          conjugation: {
            setupSequence: setup.toString(),
            inverseSetupSequence: invertSequence(setup).toString(),
            baseSequence: sequence.toString(),
            conjugatedSequence: effectiveSequence.toString(),
            baseAnalysis,
            preservesThreeCycle:
              pureThreeCycleKind(baseAnalysis) !== undefined &&
              pureThreeCycleKind(baseAnalysis) === pureThreeCycleKind(analysis),
          },
        }),
  };
}

function simulate(cube: Cube, sequence: MoveSequence): Cube {
  const simulated = cube.clone();
  for (const move of sequence) simulated.applyMove(move);
  return simulated;
}

function toCubeAnalysis(
  analysis: PermutationAnalysis,
): CubePermutationAnalysisDto {
  const corners = toPieceAnalysis(analysis, 'corner');
  const edges = toPieceAnalysis(analysis, 'edge');
  return {
    identity: corners.identity && edges.identity,
    corners,
    edges,
  };
}

function pureThreeCycleKind(
  analysis: CubePermutationAnalysisDto,
): 'corner' | 'edge' | undefined {
  if (isOnlyThreeCycle(analysis.corners) && analysis.edges.identity)
    return 'corner';
  if (isOnlyThreeCycle(analysis.edges) && analysis.corners.identity)
    return 'edge';
  return undefined;
}

function isOnlyThreeCycle(analysis: PieceAnalysisDto): boolean {
  if (analysis.cycles.length !== 1 || analysis.cycles[0]?.length !== 3)
    return false;
  const cycle = new Set(analysis.cycles[0]);
  return analysis.orientationChanges.every(({ fromLabel }) =>
    cycle.has(fromLabel),
  );
}

function toPieceAnalysis(
  analysis: PermutationAnalysis,
  kind: Exclude<CubieKind, 'center'>,
): PieceAnalysisDto {
  const entries = analysis.permutation.filter((entry) => entry.kind === kind);
  const entryById = new Map(entries.map((entry) => [entry.cubieId, entry]));
  const cycles = analysis.cycles
    .filter((cycle) => cycle.every((id) => entryById.has(id)))
    .map((cycle) => cycle.map((id) => entryById.get(id)!.fromLabel));
  const threeCycles = cycles.filter(
    (cycle): cycle is [string, string, string] => cycle.length === 3,
  );
  const orientationChanges = analysis.orientationChanges
    .filter((entry) => entry.kind === kind)
    .map(toOrientationDto);

  return {
    identity: cycles.length === 0 && orientationChanges.length === 0,
    permutation: entries.map(toPermutationDto),
    cycles,
    threeCycles,
    fixedCubieLabels: entries
      .filter((entry) => samePosition(entry.from, entry.to))
      .map((entry) => entry.fromLabel),
    orientationChanges,
  };
}

function toPermutationDto(entry: PermutationEntry): PermutationEntryDto {
  return {
    cubieId: entry.cubieId,
    from: entry.from,
    to: entry.to,
    fromLabel: entry.fromLabel,
    toLabel: entry.toLabel,
  };
}

function toOrientationDto(entry: OrientationChange): OrientationChangeDto {
  return { ...toPermutationDto(entry), delta: entry.delta };
}

function samePosition(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return left.every((coordinate, index) => coordinate === right[index]);
}
