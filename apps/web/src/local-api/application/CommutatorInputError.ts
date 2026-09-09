export type CommutatorInputPart = 'a' | 'b';

/** A/Bのどちらに不正なSingmaster tokenがあったかをapplication境界で保持する。 */
export class CommutatorInputError extends Error {
  constructor(
    readonly part: CommutatorInputPart,
    readonly token: string,
    readonly tokenIndex: number,
  ) {
    super(`Invalid ${part} move at token ${tokenIndex + 1}: ${token}`);
    this.name = 'CommutatorInputError';
  }
}
