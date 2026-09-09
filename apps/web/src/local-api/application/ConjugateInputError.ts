import { InvalidMoveSequenceError } from '@rubiks-learning/cube-core';

export class ConjugateInputError extends Error {
  constructor(readonly inputError: InvalidMoveSequenceError) {
    super(inputError.message);
    this.name = 'ConjugateInputError';
  }
}
