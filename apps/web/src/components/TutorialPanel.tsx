import type {
  TutorialProblem,
  TutorialProgress,
} from '../tutorial/tutorialProblems';
import { FaceControlPanel } from './FaceControlPanel';
import type { FacePreview } from './FaceControl';
import { SliceControlPanel } from './SliceControlPanel';
import type { CubeMove, CubeViewState } from './cubeViewModel';
import './tutorial-panel.css';

export interface TutorialPanelProps {
  readonly problems: readonly TutorialProblem[];
  readonly activeIndex: number;
  readonly clearedProblemIds: ReadonlySet<string>;
  readonly progress: TutorialProgress;
  readonly moveCount: number;
  readonly state: CubeViewState;
  readonly disabled: boolean;
  readonly notice?: string;
  readonly onSelect: (index: number) => void;
  readonly onMove: (move: CubeMove) => void;
  readonly onPreviewChange: (preview: FacePreview | null) => void;
  readonly onPrevious: () => void;
  readonly onReset: () => void;
}

export function TutorialPanel({
  problems,
  activeIndex,
  clearedProblemIds,
  progress,
  moveCount,
  state,
  disabled,
  notice,
  onSelect,
  onMove,
  onPreviewChange,
  onPrevious,
  onReset,
}: TutorialPanelProps) {
  const problem = problems[activeIndex];
  if (problem === undefined) return null;

  return (
    <section className="tutorial-panel" aria-label="Tutorial quiz">
      <ol className="tutorial-problem-list">
        {problems.map((candidate, index) => (
          <li key={candidate.id}>
            <button
              type="button"
              aria-current={index === activeIndex ? 'true' : undefined}
              disabled={disabled}
              onClick={() => onSelect(index)}
            >
              <span aria-hidden="true">
                {clearedProblemIds.has(candidate.id) ? '○' : '·'}
              </span>{' '}
              {candidate.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="tutorial-problem-card">
        <div>
          <p className="tutorial-problem-card__eyebrow">
            Quiz {activeIndex + 1} / {problems.length}
          </p>
          <h2>{problem.title}</h2>
        </div>
        <output
          className="tutorial-result"
          data-solved={progress.solved}
          aria-label="Current goal status"
        >
          {progress.solved ? 'O' : 'X'}
        </output>
        <dl className="tutorial-conditions">
          <div>
            <dt>Start</dt>
            <dd>{problem.start}</dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd>{problem.goal}</dd>
          </div>
          {problem.via !== undefined && (
            <div>
              <dt>Via</dt>
              <dd>
                {problem.via} {progress.viaSatisfied ? '✓' : ''}
              </dd>
            </div>
          )}
          {problem.fix !== undefined && (
            <div>
              <dt>Fix</dt>
              <dd>{problem.fix} edge</dd>
            </div>
          )}
          {problem.restore !== undefined && (
            <div>
              <dt>Restore</dt>
              <dd>{problem.restore}</dd>
            </div>
          )}
          <div>
            <dt>Moves</dt>
            <dd>{moveCount}</dd>
          </div>
        </dl>
        {notice !== undefined && (
          <p className="tutorial-notice" role="status">
            {notice}
          </p>
        )}
      </div>

      <FaceControlPanel
        state={state}
        onMove={onMove}
        onPreviewChange={onPreviewChange}
        disabled={disabled}
      />
      <SliceControlPanel onMove={onMove} disabled={disabled} />
      <div className="tutorial-history-controls">
        <button
          type="button"
          disabled={disabled || moveCount === 0}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button type="button" disabled={disabled} onClick={onReset}>
          Reset
        </button>
      </div>
    </section>
  );
}
