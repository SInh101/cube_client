import type {
  AnalyzedCubieKindDto,
  SequenceAnalysisResponseDto,
} from '@rubiks-learning/api-contract';
import { useState, type FormEvent } from 'react';
import type { CycleSelection } from '../analysis/cycleVisualization';
import type { StickerCycleVisualization } from '../analysis/cycleVisualization';
import { normalizeTeachingCycle } from '../analysis/cycleVisualization';
import type {
  PlaybackDirection,
  PlaybackStatus,
} from '../playback/playbackTypes';
import './cycle-teaching-panel.css';

export type CycleDisplayMode = 'highlight' | 'labels' | 'stickers';
export interface CycleTeachingPanelProps {
  readonly result?: SequenceAnalysisResponseDto;
  readonly selection?: CycleSelection;
  readonly displayMode: CycleDisplayMode;
  readonly stickerCycles?: readonly StickerCycleVisualization[];
  readonly stickerCycleIndex: number;
  readonly currentIndex: number;
  readonly moveCount: number;
  readonly status: PlaybackStatus;
  readonly direction: PlaybackDirection;
  readonly isLoading: boolean;
  readonly disabled?: boolean;
  readonly playbackDisabled?: boolean;
  readonly errorMessage?: string;
  readonly onAnalyze: (sequence: string, conjugate: string) => void;
  readonly onClear: () => void;
  readonly onSelectCycle: (kind: AnalyzedCubieKindDto, index: number) => void;
  readonly onDisplayModeChange: (mode: CycleDisplayMode) => void;
  readonly onStickerCycleIndexChange: (index: number) => void;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onPlay: () => void;
  readonly onReversePlay: () => void;
}

export function CycleTeachingPanel(props: CycleTeachingPanelProps) {
  const [sequence, setSequence] = useState("R' D R U2 R' D' R U2");
  const [conjugate, setConjugate] = useState('');
  const isBusy = props.disabled || props.status === 'playing';
  const playbackBusy = isBusy || props.playbackDisabled;
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    props.onAnalyze(sequence, conjugate);
  };
  return (
    <section className="cycle-teaching" aria-labelledby="cycle-title">
      <h2 id="cycle-title">3-cycle analysis</h2>
      <form className="cycle-teaching__form" onSubmit={submit}>
        <label>
          Sequence
          <input
            value={sequence}
            disabled={isBusy || props.isLoading}
            onChange={(event) => setSequence(event.target.value)}
          />
        </label>
        <label>
          Conjugate setup (X)
          <input
            value={conjugate}
            placeholder="Example: U R"
            disabled={isBusy || props.isLoading}
            onChange={(event) => setConjugate(event.target.value)}
          />
        </label>
        <p className="cycle-teaching__hint">[X: A] = X A X&apos;</p>
        <button type="submit" disabled={isBusy || props.isLoading}>
          {props.isLoading ? 'Analyzing…' : 'Analyze sequence'}
        </button>
      </form>
      {props.errorMessage !== undefined && (
        <p role="alert">{props.errorMessage}</p>
      )}
      {props.result !== undefined && (
        <>
          {props.result.conjugation !== undefined && (
            <ConjugationResult result={props.result} />
          )}
          <div className="cycle-teaching__result-heading">
            <p>
              {props.result.analysis.identity
                ? 'Identity'
                : 'Permutation detected'}
            </p>
            <button type="button" disabled={isBusy} onClick={props.onClear}>
              Close analysis
            </button>
          </div>
          <div className="cycle-teaching__cycles">
            {(['corner', 'edge'] as const).map((kind) => {
              const cycles =
                kind === 'corner'
                  ? props.result!.analysis.corners.threeCycles
                  : props.result!.analysis.edges.threeCycles;
              return (
                <div key={kind}>
                  <h3>
                    {kind === 'corner' ? 'Corner 3-cycles' : 'Edge 3-cycles'}
                  </h3>
                  {cycles.length === 0 ? (
                    <p>None</p>
                  ) : (
                    cycles.map((cycle, index) => {
                      const isSelected =
                        props.selection?.kind === kind &&
                        props.selection.index === index;
                      const displayedCycle =
                        isSelected && props.stickerCycles?.[0] !== undefined
                          ? props.stickerCycles[0].labels
                          : cycle;
                      return (
                        <button
                          key={cycle.join('-')}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => props.onSelectCycle(kind, index)}
                        >
                          ({displayedCycle.join(' → ')})
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
          <div className="cycle-teaching__details">
            <p>
              Corner orientation:{' '}
              {formatOrientations(
                props.result.analysis.corners.orientationChanges,
              )}
            </p>
            <p>
              Edge orientation:{' '}
              {formatOrientations(
                props.result.analysis.edges.orientationChanges,
              )}
            </p>
            <p>
              Fixed corners:{' '}
              {props.result.analysis.corners.fixedCubieLabels.join(', ') ||
                'none'}
            </p>
            <p>
              Fixed edges:{' '}
              {props.result.analysis.edges.fixedCubieLabels.join(', ') ||
                'none'}
            </p>
          </div>
          <fieldset className="cycle-teaching__modes">
            <legend>3D display</legend>
            <label>
              <input
                type="radio"
                name="cycle-display"
                checked={props.displayMode === 'highlight'}
                onChange={() => props.onDisplayModeChange('highlight')}
              />
              Highlight pieces
            </label>
            <label>
              <input
                type="radio"
                name="cycle-display"
                checked={props.displayMode === 'labels'}
                onChange={() => props.onDisplayModeChange('labels')}
              />
              Show position labels
            </label>
            <label>
              <input
                type="radio"
                name="cycle-display"
                checked={props.displayMode === 'stickers'}
                onChange={() => props.onDisplayModeChange('stickers')}
              />
              Visualize stickers
            </label>
          </fieldset>
          {props.displayMode === 'stickers' &&
            props.stickerCycles !== undefined && (
              <div className="cycle-teaching__sticker-cycles">
                <h3>Sticker cycles</h3>
                {props.stickerCycles.map((cycle, index) => (
                  <button
                    key={cycle.labels.join('-')}
                    type="button"
                    aria-pressed={props.stickerCycleIndex === index}
                    onClick={() => props.onStickerCycleIndexChange(index)}
                  >
                    {cycle.labels.join(' → ')}
                  </button>
                ))}
              </div>
            )}
          <p aria-label="Cycle playback position">
            {props.currentIndex} / {props.moveCount} ({props.direction})
          </p>
          <div className="cycle-teaching__playback">
            <button
              type="button"
              disabled={playbackBusy || props.currentIndex <= 0}
              onClick={props.onPrevious}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={playbackBusy || props.currentIndex >= props.moveCount}
              onClick={props.onNext}
            >
              Next
            </button>
            <button
              type="button"
              disabled={playbackBusy || props.currentIndex >= props.moveCount}
              onClick={props.onPlay}
            >
              Play all
            </button>
            <button
              type="button"
              disabled={playbackBusy || props.currentIndex <= 0}
              onClick={props.onReversePlay}
            >
              Reverse all
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function ConjugationResult({
  result,
}: {
  result: SequenceAnalysisResponseDto;
}) {
  const conjugation = result.conjugation;
  if (conjugation === undefined) return null;
  const base = findPureThreeCycle(conjugation.baseAnalysis);
  const shifted = findPureThreeCycle(result.analysis);
  return (
    <section
      className="cycle-teaching__conjugation"
      aria-label="Conjugation result"
    >
      <h3>Conjugation</h3>
      <p>Setup: {conjugation.setupSequence}</p>
      <p>Expanded: {conjugation.conjugatedSequence}</p>
      <p>Base position: {formatCycle(base)}</p>
      <p>Shifted position: {formatCycle(shifted)}</p>
      <p
        className={
          conjugation.preservesThreeCycle ? 'is-preserved' : 'is-not-preserved'
        }
      >
        {conjugation.preservesThreeCycle
          ? 'Pure 3-cycle preserved'
          : 'The base sequence is not preserved as a pure 3-cycle'}
      </p>
    </section>
  );
}

function findPureThreeCycle(
  analysis: SequenceAnalysisResponseDto['analysis'],
): readonly [string, string, string] | undefined {
  for (const kind of ['corner', 'edge'] as const) {
    const group = kind === 'corner' ? analysis.corners : analysis.edges;
    const other = kind === 'corner' ? analysis.edges : analysis.corners;
    if (
      group.cycles.length === 1 &&
      group.threeCycles.length === 1 &&
      other.identity
    ) {
      return normalizeTeachingCycle(group.threeCycles[0]!, kind);
    }
  }
  return undefined;
}

function formatCycle(cycle: readonly string[] | undefined): string {
  return cycle === undefined ? 'not a pure 3-cycle' : cycle.join(' → ');
}

function formatOrientations(
  changes: SequenceAnalysisResponseDto['analysis']['corners']['orientationChanges'],
): string {
  return changes.length === 0
    ? 'none'
    : changes
        .map(({ fromLabel, delta }) => `${fromLabel} Δ${delta}`)
        .join(', ');
}
