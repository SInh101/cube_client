import type { CubeMove } from './cubeViewModel';
import './move-sequence-control.css';

export interface MoveSequenceControlProps {
  readonly sequenceInput: string;
  readonly preparedMoves: readonly CubeMove[];
  readonly isLoading: boolean;
  readonly disabled?: boolean;
  readonly errorMessage?: string;
  readonly onSequenceInputChange: (value: string) => void;
  readonly onPrepare: () => void;
  readonly onApplyMove: (move: CubeMove) => void;
}

/**
 * MoveSequence入力と、検証済みMoveを一手ずつ選ぶUI。
 *
 * 入力のstate、HTTP通信、一手適用処理はpropsとして呼び出し元に委譲する。
 */
export function MoveSequenceControl({
  sequenceInput,
  preparedMoves,
  isLoading,
  disabled = false,
  errorMessage,
  onSequenceInputChange,
  onPrepare,
  onApplyMove,
}: MoveSequenceControlProps) {
  return (
    <section className="move-sequence-control" aria-labelledby="sequence-title">
      <h2 id="sequence-title">Move sequence</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onPrepare();
        }}
      >
        <label htmlFor="move-sequence-input">Sequence</label>
        <textarea
          id="move-sequence-input"
          rows={3}
          value={sequenceInput}
          disabled={isLoading || disabled}
          placeholder="R U R' U'"
          onChange={(event) => onSequenceInputChange(event.target.value)}
        />
        <button type="submit" disabled={isLoading || disabled}>
          {isLoading ? 'Preparing…' : 'Prepare moves'}
        </button>
      </form>

      {errorMessage !== undefined && <p role="alert">{errorMessage}</p>}

      {preparedMoves.length > 0 && (
        <div className="move-sequence-control__prepared">
          <h3>Prepared moves</h3>
          <ol aria-label="Prepared moves">
            {preparedMoves.map((move, index) => (
              <li key={`${index}-${move}`}>
                <button
                  type="button"
                  disabled={isLoading || disabled}
                  aria-label={`Apply move ${index + 1}: ${move}`}
                  onClick={() => onApplyMove(move)}
                >
                  {move}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
