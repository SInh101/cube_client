export interface PresetRecord {
  readonly id: string;
  readonly name: string;
  readonly moves: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface PresetRepository {
  create(input: { name: string; moves: string }): Promise<PresetRecord>;
  list(): Promise<readonly PresetRecord[]>;
  findById(id: string): Promise<PresetRecord | undefined>;
  update(
    id: string,
    input: { name?: string; moves?: string },
  ): Promise<PresetRecord | undefined>;
  delete(id: string): Promise<boolean>;
}
