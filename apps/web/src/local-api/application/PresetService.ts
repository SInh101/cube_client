import type {
  CreatePresetRequestDto,
  PresetListResponseDto,
  PresetResponseDto,
  UpdatePresetRequestDto,
} from '@rubiks-learning/api-contract';
import { parseSequence } from '@rubiks-learning/cube-core';
import type { PresetRecord, PresetRepository } from '../repository/index.js';
import { InvalidPresetError, PresetNotFoundError } from './PresetErrors.js';
export class PresetService {
  constructor(private readonly repository: PresetRepository) {}
  async create(input: CreatePresetRequestDto): Promise<PresetResponseDto> {
    const value = validate(input, false);
    return toDto(
      await this.repository.create({ name: value.name!, moves: value.moves! }),
    );
  }
  async list(): Promise<PresetListResponseDto> {
    return { presets: (await this.repository.list()).map(toDto) };
  }
  async get(id: string): Promise<PresetResponseDto> {
    const record = await this.repository.findById(id);
    if (!record) throw new PresetNotFoundError();
    return toDto(record);
  }
  async update(
    id: string,
    input: UpdatePresetRequestDto,
  ): Promise<PresetResponseDto> {
    const value = validate(input, true);
    const record = await this.repository.update(id, value);
    if (!record) throw new PresetNotFoundError();
    return toDto(record);
  }
  async delete(id: string): Promise<void> {
    if (!(await this.repository.delete(id))) throw new PresetNotFoundError();
  }
}
function validate(
  input: CreatePresetRequestDto | UpdatePresetRequestDto,
  partial: boolean,
): { name?: string; moves?: string } {
  if (typeof input !== 'object' || input === null)
    throw new InvalidPresetError('body', 'must be a JSON object');
  const name = input.name;
  const moves = input.moves;
  if (!partial && (name === undefined || moves === undefined))
    throw new InvalidPresetError('body', 'name and moves are required');
  if (partial && name === undefined && moves === undefined)
    throw new InvalidPresetError('body', 'at least one field is required');
  const result: { name?: string; moves?: string } = {};
  if (name !== undefined) {
    if (
      typeof name !== 'string' ||
      name.trim().length < 1 ||
      name.trim().length > 100
    )
      throw new InvalidPresetError('name', 'must contain 1 to 100 characters');
    result.name = name.trim();
  }
  if (moves !== undefined) {
    if (typeof moves !== 'string')
      throw new InvalidPresetError('moves', 'must be a string');
    try {
      result.moves = parseSequence(moves).toString();
    } catch {
      throw new InvalidPresetError('moves', 'must be a valid Move sequence');
    }
  }
  return result;
}
function toDto(record: PresetRecord): PresetResponseDto {
  return { ...record };
}
