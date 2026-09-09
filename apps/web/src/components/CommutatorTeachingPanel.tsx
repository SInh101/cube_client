import type {
  CommutatorPartDto,
  PreparedCommutatorResponseDto,
} from '@rubiks-learning/api-contract';
import { useState, type FormEvent } from 'react';

import './commutator-teaching-panel.css';

export interface CommutatorTeachingPanelProps {
  readonly definition?: PreparedCommutatorResponseDto;
  readonly activePart?: CommutatorPartDto;
  readonly isLoading: boolean;
  readonly disabled?: boolean;
  readonly playDisabled?: boolean;
  readonly playNextDisabled?: boolean;
  readonly errorMessage?: string;
  readonly onPrepare: (a: string, b: string) => void;
  readonly onPlay: () => void;
  readonly onPlayNextPart: () => void;
}

const PART_LABELS: Readonly<Record<CommutatorPartDto, string>> = {
  A: 'A',
  B: 'B',
  A_INVERSE: 'A⁻¹',
  B_INVERSE: 'B⁻¹',
};

/** 交換子の入力、4部分、現在部分を表示する教材用presentational component。 */
export function CommutatorTeachingPanel({
  definition,
  activePart,
  isLoading,
  disabled = false,
  playDisabled = false,
  playNextDisabled = false,
  errorMessage,
  onPrepare,
  onPlay,
  onPlayNextPart,
}: CommutatorTeachingPanelProps) {
  const [a, setA] = useState('R');
  const [b, setB] = useState('U');
  const [preparedExpression, setPreparedExpression] = useState({ a, b });

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setPreparedExpression({ a, b });
    onPrepare(a, b);
  };

  return (
    <section className="commutator-teaching" aria-labelledby="commutator-title">
      <h2 id="commutator-title">Commutator</h2>
      <form className="commutator-teaching__form" onSubmit={submit}>
        <label>
          A
          <input
            value={a}
            disabled={disabled || isLoading}
            onChange={(event) => setA(event.target.value)}
          />
        </label>
        <label>
          B
          <input
            value={b}
            disabled={disabled || isLoading}
            onChange={(event) => setB(event.target.value)}
          />
        </label>
        <button type="submit" disabled={disabled || isLoading}>
          {isLoading ? 'Preparing…' : 'Prepare commutator'}
        </button>
      </form>

      {errorMessage !== undefined && <p role="alert">{errorMessage}</p>}

      {definition !== undefined && (
        <div className="commutator-teaching__lesson">
          <p className="commutator-teaching__notation">
            [{preparedExpression.a}, {preparedExpression.b}] ={' '}
            {definition.sequence || 'identity'}
          </p>
          <ol
            className="commutator-teaching__parts"
            aria-label="Commutator parts"
          >
            {definition.boundaries.map((boundary) => (
              <li
                key={boundary.part}
                className="commutator-teaching__part"
                aria-current={boundary.part === activePart ? 'step' : undefined}
              >
                <strong>{PART_LABELS[boundary.part]}</strong>
                <span>{boundary.moves.join(' ') || 'identity'}</span>
              </li>
            ))}
          </ol>
          <div className="commutator-teaching__actions">
            <button
              type="button"
              disabled={
                disabled || playDisabled || definition.moves.length === 0
              }
              onClick={onPlay}
            >
              Play commutator
            </button>
            <button
              type="button"
              disabled={disabled || playNextDisabled}
              onClick={onPlayNextPart}
            >
              Play next part
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
