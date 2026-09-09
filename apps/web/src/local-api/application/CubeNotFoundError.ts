/** 指定された識別子のCubeがrepositoryに存在しないことを表す。 */
export class CubeNotFoundError extends Error {
  constructor(readonly cubeId: string) {
    super(`Cube not found: ${cubeId}`);
    this.name = 'CubeNotFoundError';
  }
}
