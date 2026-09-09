export class PresetNotFoundError extends Error {}
export class InvalidPresetError extends Error {
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super(`${field}: ${reason}`);
  }
}
