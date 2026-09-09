import type { PresetRecord, PresetRepository } from './PresetRepository.js';

const STORAGE_KEY = 'rubiks-learning.presets.v1';

export class LocalStoragePresetRepository implements PresetRepository {
  async create(input: { name: string; moves: string }): Promise<PresetRecord> {
    const records = this.read();
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.write([...records, record]);
    return record;
  }

  async list(): Promise<readonly PresetRecord[]> {
    return this.read();
  }

  async findById(id: string): Promise<PresetRecord | undefined> {
    return this.read().find((record) => record.id === id);
  }

  async update(
    id: string,
    input: { name?: string; moves?: string },
  ): Promise<PresetRecord | undefined> {
    const records = this.read();
    const index = records.findIndex((record) => record.id === id);
    const current = records[index];
    if (current === undefined) return undefined;
    const updated = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    records[index] = updated;
    this.write(records);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const records = this.read();
    const remaining = records.filter((record) => record.id !== id);
    if (remaining.length === records.length) return false;
    this.write(remaining);
    return true;
  }

  private read(): PresetRecord[] {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value === null) return [];
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as PresetRecord[]) : [];
    } catch {
      return [];
    }
  }

  private write(records: readonly PresetRecord[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}
