export interface PresetResponseDto {
  readonly id: string;
  readonly name: string;
  readonly moves: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface PresetListResponseDto {
  readonly presets: readonly PresetResponseDto[];
}
export interface CreatePresetRequestDto {
  readonly name: string;
  readonly moves: string;
}
export interface UpdatePresetRequestDto {
  readonly name?: string;
  readonly moves?: string;
}
