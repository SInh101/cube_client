// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { LocalStoragePresetRepository } from './LocalStoragePresetRepository.js';

beforeEach(() => localStorage.clear());

describe('LocalStoragePresetRepository', () => {
  it('keeps presets across repository instances', async () => {
    const created = await new LocalStoragePresetRepository().create({
      name: 'Sexy move',
      moves: "R U R' U'",
    });

    await expect(new LocalStoragePresetRepository().list()).resolves.toEqual([
      created,
    ]);
  });

  it('updates and deletes persisted presets', async () => {
    const repository = new LocalStoragePresetRepository();
    const created = await repository.create({ name: 'Old', moves: 'R' });
    await repository.update(created.id, { name: 'New', moves: 'M2' });

    await expect(repository.findById(created.id)).resolves.toMatchObject({
      name: 'New',
      moves: 'M2',
    });
    await expect(repository.delete(created.id)).resolves.toBe(true);
    await expect(repository.list()).resolves.toEqual([]);
  });
});
