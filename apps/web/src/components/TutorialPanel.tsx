import type { Parity, ParitySession } from '../tutorial/parityQuiz';
import type {
  TutorialProblem,
  TutorialProblemGroup,
  TutorialProgress,
} from '../tutorial/tutorialProblems';
import { useState } from 'react';
import { FaceControlPanel } from './FaceControlPanel';
import type { FacePreview } from './FaceControl';
import { SliceControlPanel } from './SliceControlPanel';
import type { CubeMove, CubeViewState } from './cubeViewModel';
import './tutorial-panel.css';

export interface TutorialPanelProps {
  readonly problems: readonly TutorialProblem[];
  readonly problemGroups: readonly TutorialProblemGroup[];
  readonly activeIndex: number;
  readonly clearedProblemIds: ReadonlySet<string>;
  readonly progress: TutorialProgress;
  readonly moveCount: number;
  readonly state: CubeViewState;
  readonly disabled: boolean;
  readonly notice?: string;
  readonly paritySession?: ParitySession;
  readonly onParityAnswer?: (answer: Parity) => void;
  readonly onSelect: (index: number) => void;
  readonly onMove: (move: CubeMove) => void;
  readonly onPreviewChange: (preview: FacePreview | null) => void;
  readonly onPrevious: () => void;
  readonly onReset: () => void;
}

export function TutorialPanel({
  problems,
  problemGroups,
  activeIndex,
  clearedProblemIds,
  progress,
  moveCount,
  state,
  disabled,
  notice,
  paritySession,
  onParityAnswer,
  onSelect,
  onMove,
  onPreviewChange,
  onPrevious,
  onReset,
}: TutorialPanelProps) {
  const problem = problems[activeIndex];
  const activeCategory = problemGroups.find((group) =>
    problem === undefined ? false : groupContainsProblem(group, problem.id),
  );
  const [openGroupId, setOpenGroupId] = useState(
    activeCategory?.id ?? problemGroups[0]?.id,
  );
  if (problem === undefined) return null;
  const currentProblemId = problem.id;
  const openGroup = problemGroups.find(({ id }) => id === openGroupId);
  const activeProblemVisible =
    openGroup !== undefined &&
    groupContainsProblem(openGroup, currentProblemId);

  function selectGroup(group: TutorialProblemGroup): void {
    setOpenGroupId(group.id);
    const firstProblem = firstProblemIn(group);
    if (
      firstProblem !== undefined &&
      !groupContainsProblem(group, currentProblemId)
    ) {
      onSelect(problems.findIndex(({ id }) => id === firstProblem.id));
    }
  }

  return (
    <section className="tutorial-panel" aria-label="Tutorial quiz">
      <nav className="tutorial-index" aria-label="Tutorial problems">
        <ul className="tutorial-category-list">
          {problemGroups.map((group) => {
            const expanded = group.id === openGroupId;
            return (
              <li key={group.id}>
                <button
                  type="button"
                  className="tutorial-category-button"
                  aria-expanded={expanded}
                  disabled={disabled}
                  onClick={() => selectGroup(group)}
                >
                  <span>{group.title}</span>
                  <span aria-hidden="true">{expanded ? '−' : '+'}</span>
                </button>
                {expanded &&
                  (group.groups !== undefined ? (
                    <TutorialGroupList
                      groups={group.groups}
                      problems={problems}
                      activeIndex={activeIndex}
                      clearedProblemIds={clearedProblemIds}
                      disabled={disabled}
                      onSelect={onSelect}
                    />
                  ) : (
                    <p className="tutorial-empty-group">
                      問題は今後追加予定です。
                    </p>
                  ))}
              </li>
            );
          })}
        </ul>
      </nav>

      {activeProblemVisible && problem.parity !== undefined && (
        <section className="tutorial-marker-guide" aria-label="偶奇判定クイズ">
          <h2>{problem.title}</h2>
          <p>
            {problem.parity.pieces === 'edge' ? 'エッジ12個' : 'コーナー8個'}
            の位置の置換は、完成状態と比べて偶置換ですか、奇置換ですか？
            向きは問いません。
          </p>
          <p>
            2個の交換を偶数回で表せる置換が偶置換、奇数回で表せる置換が奇置換です。全6面の色と面名を、Viewで視点を変えて確認できます。
          </p>
          {problem.parity.mode === 'random' && (
            <p>
              正解・不正解にかかわらず、回答すると新しいシャッフル状態を出題します。
            </p>
          )}
          <p>
            第{paritySession?.question ?? 1}問 · 正解{' '}
            {paritySession?.correct ?? 0} / 回答 {paritySession?.attempts ?? 0}
          </p>
          <div className="tutorial-history-controls">
            <button
              type="button"
              disabled={disabled || paritySession === undefined}
              onClick={() => onParityAnswer?.('even')}
            >
              偶置換
            </button>
            <button
              type="button"
              disabled={disabled || paritySession === undefined}
              onClick={() => onParityAnswer?.('odd')}
            >
              奇置換
            </button>
          </div>
          <p role="status" aria-live="polite">
            {paritySession?.feedback ?? '偶・奇のボタンで回答してください。'}
          </p>
          <div className="tutorial-history-controls">
            <button type="button" disabled={disabled} onClick={onReset}>
              {problem.parity.mode === 'random'
                ? 'ランダム練習をリセット'
                : '固定問題をリセット'}
            </button>
          </div>
        </section>
      )}
      {activeProblemVisible && problem.parity === undefined && (
        <>
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
                  <dd>{problem.fix}</dd>
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

          <aside
            className="tutorial-marker-guide"
            aria-labelledby="marker-guide-title"
          >
            <div className="tutorial-marker-guide__intro">
              <h2 id="marker-guide-title">How to read the quiz</h2>
              <p>
                In <code>FLD -&gt; URB</code>, move the{' '}
                <strong>F sticker</strong> at FLD to the <strong>U face</strong>{' '}
                at URB. The first letter identifies the sticker and all letters
                identify its position.
              </p>
              <p>
                When <code>corner</code> or <code>edge</code> is shown, move the
                whole colored piece to the destination; its orientation does not
                matter.
              </p>
            </div>
            <dl className="tutorial-marker-guide__items">
              <div>
                <dt>
                  <MarkerBadge kind="tracked">●</MarkerBadge> Tracked
                </dt>
                <dd>The colored sticker or piece you move to the Goal.</dd>
              </div>
              <div>
                <dt>
                  <MarkerBadge kind="goal">G</MarkerBadge> Goal
                </dt>
                <dd>The destination face and position.</dd>
              </div>
              <div>
                <dt>
                  <MarkerBadge kind="via">V</MarkerBadge> Via
                </dt>
                <dd>
                  The tracked target must pass here. Position quizzes ignore its
                  orientation.
                </dd>
              </div>
              <div>
                <dt>
                  <MarkerBadge kind="fix">F</MarkerBadge> Fix
                </dt>
                <dd>This piece must not move. Forbidden turns are rejected.</dd>
              </div>
              <div>
                <dt>
                  <MarkerBadge kind="restore">R</MarkerBadge> Restore
                </dt>
                <dd>
                  The solid R is the correct location. The translucent R follows
                  its sticker; return both to the same place when you reach
                  Goal.
                </dd>
              </div>
              <div>
                <dt>
                  <span className="tutorial-status-key">
                    <b>X</b>
                    <b>O</b>
                  </span>{' '}
                  Status
                </dt>
                <dd>
                  X is not solved yet; O means every condition is satisfied.
                </dd>
              </div>
            </dl>
            <p className="tutorial-marker-guide__note">
              Gray stickers are not being tracked. U, R, F, D, L and B are face
              names; changing the View does not turn the cube or add a move.
            </p>
          </aside>

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
        </>
      )}
    </section>
  );
}

function groupContainsProblem(
  group: TutorialProblemGroup,
  problemId: string,
): boolean {
  return (
    group.problems?.some(({ id }) => id === problemId) === true ||
    group.groups?.some((child) => groupContainsProblem(child, problemId)) ===
      true
  );
}

function firstProblemIn(
  group: TutorialProblemGroup,
): TutorialProblem | undefined {
  return (
    group.problems?.[0] ??
    group.groups?.map(firstProblemIn).find((problem) => problem !== undefined)
  );
}

function TutorialGroupList({
  groups,
  problems,
  activeIndex,
  clearedProblemIds,
  disabled,
  onSelect,
  depth = 0,
}: {
  readonly groups: readonly TutorialProblemGroup[];
  readonly problems: readonly TutorialProblem[];
  readonly activeIndex: number;
  readonly clearedProblemIds: ReadonlySet<string>;
  readonly disabled: boolean;
  readonly onSelect: (index: number) => void;
  readonly depth?: number;
}) {
  return (
    <ul className="tutorial-group-list" data-depth={depth}>
      {groups.map((group) => (
        <li key={group.id} className="tutorial-group">
          <h2 className="tutorial-group__title">{group.title}</h2>
          {group.groups !== undefined && (
            <TutorialGroupList
              groups={group.groups}
              problems={problems}
              activeIndex={activeIndex}
              clearedProblemIds={clearedProblemIds}
              disabled={disabled}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
          {group.problems !== undefined && (
            <ol className="tutorial-problem-list">
              {group.problems.map((candidate) => {
                const index = problems.findIndex(
                  (problem) => problem.id === candidate.id,
                );
                return (
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
                );
              })}
            </ol>
          )}
        </li>
      ))}
    </ul>
  );
}

function MarkerBadge({
  kind,
  children,
}: {
  readonly kind: 'tracked' | 'goal' | 'via' | 'fix' | 'restore';
  readonly children: string;
}) {
  return (
    <span className="tutorial-marker-badge" data-kind={kind} aria-hidden="true">
      {children}
    </span>
  );
}
