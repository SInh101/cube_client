import type { PresetRepository } from './PresetRepository.js';
import { LocalStoragePresetRepository } from './LocalStoragePresetRepository.js';

export const presetRepository: PresetRepository =
  new LocalStoragePresetRepository();
