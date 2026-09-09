import type { CubeStateResponseDto } from './cubes.js';
import type { MoveDto } from './moves.js';

export type AnalyzedCubieKindDto = 'corner' | 'edge';
export type CubieCoordinateDto = -1 | 0 | 1;
export type CubiePositionDto = readonly [
  CubieCoordinateDto,
  CubieCoordinateDto,
  CubieCoordinateDto,
];

export interface AnalyzeSequenceRequestDto {
  readonly sequence: string;
  readonly conjugate?: string;
}

export interface PermutationEntryDto {
  readonly cubieId: string;
  readonly from: CubiePositionDto;
  readonly to: CubiePositionDto;
  readonly fromLabel: string;
  readonly toLabel: string;
}

export interface OrientationChangeDto extends PermutationEntryDto {
  readonly delta: 1 | 2;
}

export interface PieceAnalysisDto {
  readonly identity: boolean;
  readonly permutation: readonly PermutationEntryDto[];
  readonly cycles: readonly (readonly string[])[];
  readonly threeCycles: readonly (readonly [string, string, string])[];
  readonly fixedCubieLabels: readonly string[];
  readonly orientationChanges: readonly OrientationChangeDto[];
}

export interface CubePermutationAnalysisDto {
  readonly identity: boolean;
  readonly corners: PieceAnalysisDto;
  readonly edges: PieceAnalysisDto;
}

export interface ConjugationAnalysisDto {
  readonly setupSequence: string;
  readonly inverseSetupSequence: string;
  readonly baseSequence: string;
  readonly conjugatedSequence: string;
  readonly baseAnalysis: CubePermutationAnalysisDto;
  readonly preservesThreeCycle: boolean;
}

export interface SequenceAnalysisResponseDto extends CubeStateResponseDto {
  readonly sequence: string;
  readonly moves: readonly MoveDto[];
  readonly resultState: CubeStateResponseDto['state'];
  readonly analysis: CubePermutationAnalysisDto;
  readonly conjugation?: ConjugationAnalysisDto;
}
