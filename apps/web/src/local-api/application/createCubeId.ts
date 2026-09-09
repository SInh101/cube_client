/** API側で新しいCube resourceのUUIDを生成する。 */
export function createCubeId(): string {
  return crypto.randomUUID();
}
