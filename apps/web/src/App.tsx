import type {
  CommutatorPartDto,
  CreateCubeResponseDto,
  CubeStateResponseDto,
  MoveBatchResponseDto,
  MoveSequenceResponseDto,
  PreparedCommutatorResponseDto,
  PresetResponseDto,
  SequenceAnalysisResponseDto,
} from '@rubiks-learning/api-contract';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AnimationSpeedControl,
  CommutatorTeachingPanel,
  CycleTeachingPanel,
  CubeView,
  DEFAULT_ANIMATION_DURATION_MS,
  FaceControlPanel,
  findChangedCubieIds,
  MoveSequenceControl,
  PlaybackControls,
  PresetPanel,
  SliceControlPanel,
  type CubeMove,
  type CycleDisplayMode,
  type FacePreview,
} from './components';
import {
  createCycleStickerMarkers,
  createCycleVisualization,
  firstThreeCycle,
  type CycleSelection,
} from './analysis/cycleVisualization';
import './components/face-controls.css';
import { ToolModeTabs, type ToolMode } from './components/ToolModeTabs';
import { usePlayback } from './playback/usePlayback';

type LoadStatus = 'loading' | 'ready' | 'error';
type KeyboardMove = 'R' | 'L' | 'U' | 'D' | 'F' | 'B' | 'M' | 'E' | 'S';

const KEYBOARD_MOVES = ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S'] as const;
const API_BASE_URL = '';

export function App() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [cubeId, setCubeId] = useState<string | null>(null);
  const [cubeState, setCubeState] = useState<
    CubeStateResponseDto['state'] | null
  >(null);
  const [moveError, setMoveError] = useState(false);
  const [lastMove, setLastMove] = useState<CubeMove | null>(null);
  const [animationId, setAnimationId] = useState(0);
  const [animationDurationMs, setAnimationDurationMs] = useState(
    DEFAULT_ANIMATION_DURATION_MS,
  );
  const [facePreview, setFacePreview] = useState<FacePreview | null>(null);
  const [sequenceInput, setSequenceInput] = useState('');
  const [preparedMoves, setPreparedMoves] = useState<readonly CubeMove[]>([]);
  const [preparedMovesRevision, setPreparedMovesRevision] = useState(0);
  const [isSequenceLoading, setIsSequenceLoading] = useState(false);
  const [sequenceError, setSequenceError] = useState<string>();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const resetInFlightRef = useRef(false);
  const [commutator, setCommutator] = useState<
    PreparedCommutatorResponseDto | undefined
  >();
  const [commutatorBaseState, setCommutatorBaseState] = useState<
    CubeStateResponseDto['state'] | undefined
  >();
  const [isCommutatorLoading, setIsCommutatorLoading] = useState(false);
  const [commutatorError, setCommutatorError] = useState<string>();
  const [cycleAnalysis, setCycleAnalysis] = useState<
    SequenceAnalysisResponseDto | undefined
  >();
  const [cycleSelection, setCycleSelection] = useState<
    CycleSelection | undefined
  >();
  const [cycleDisplayMode, setCycleDisplayMode] =
    useState<CycleDisplayMode>('highlight');
  const [stickerCycleIndex, setStickerCycleIndex] = useState(0);
  const [isCycleAnalysisLoading, setIsCycleAnalysisLoading] = useState(false);
  const [cycleAnalysisError, setCycleAnalysisError] = useState<string>();
  const [toolMode, setToolMode] = useState<ToolMode>('practice');
  const batchedMoveStatesRef = useRef<
    { readonly move: CubeMove; readonly state: CubeStateResponseDto['state'] }[]
  >([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCube(): Promise<void> {
      try {
        const createResponse = await fetch(`${API_BASE_URL}/api/cubes`, {
          method: 'POST',
          signal: controller.signal,
        });
        if (!createResponse.ok) {
          throw new Error(`Cube creation failed: ${createResponse.status}`);
        }
        const createDto = (await createResponse.json()) as
          CreateCubeResponseDto | { readonly cubeId: string };

        const stateDto =
          'state' in createDto
            ? createDto
            : await getCreatedCube(createDto.cubeId, controller.signal);

        setCubeId(createDto.cubeId);
        setCubeState(stateDto.state);
        setStatus('ready');
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setStatus('error');
      }
    }

    void loadCube();
    return () => controller.abort();
  }, []);

  const applyMove = useCallback(
    async (move: CubeMove): Promise<void> => {
      if (cubeId === null) throw new Error('Cube is not ready');
      if (isAnimating) throw new Error('Cube is animating');
      if (resetInFlightRef.current) throw new Error('Cube is resetting');

      setFacePreview(null);
      setMoveError(false);
      try {
        const prepared = batchedMoveStatesRef.current.shift();
        if (prepared !== undefined) {
          if (prepared.move !== move) {
            batchedMoveStatesRef.current = [];
            throw new Error('Prepared playback order does not match');
          }
          setCubeState(prepared.state);
          setLastMove(move);
          setAnimationId((current) => current + 1);
          setIsAnimating(true);
          return;
        }
        const response = await fetch(
          `${API_BASE_URL}/api/cubes/${cubeId}/moves`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ move }),
          },
        );
        if (!response.ok) {
          throw new Error(`Move application failed: ${response.status}`);
        }
        const dto = (await response.json()) as CubeStateResponseDto;
        setCubeState(dto.state);
        setLastMove(move);
        setAnimationId((current) => current + 1);
        setIsAnimating(true);
      } catch (error: unknown) {
        setMoveError(true);
        throw error;
      }
    },
    [cubeId, isAnimating],
  );
  const applyMoveRef = useRef(applyMove);
  applyMoveRef.current = applyMove;

  const prepareMovesForPlayback = useCallback(
    async (moves: readonly CubeMove[]): Promise<void> => {
      if (cubeId === null) throw new Error('Cube is not ready');
      if (resetInFlightRef.current) throw new Error('Cube is resetting');
      const pendingMoves = batchedMoveStatesRef.current.map(({ move }) => move);
      if (
        pendingMoves.length === moves.length &&
        pendingMoves.every((move, index) => move === moves[index])
      ) {
        return;
      }
      // The server has already applied a prepared batch. If playback changes
      // direction while paused, first undo the not-yet-animated suffix so the
      // persisted state remains aligned with the visible state.
      const compensationMoves = invertMoves(pendingMoves);
      const requestMoves = [...compensationMoves, ...moves];
      const response = await fetch(
        `${API_BASE_URL}/api/cubes/${cubeId}/moves`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ moves: requestMoves }),
        },
      );
      if (!response.ok) {
        throw new Error(`Move batch application failed: ${response.status}`);
      }
      const dto = (await response.json()) as MoveBatchResponseDto;
      if (dto.states.length !== requestMoves.length) {
        throw new Error('Move batch response length does not match');
      }
      batchedMoveStatesRef.current = moves.map((move, index) => ({
        move,
        state: dto.states[
          compensationMoves.length + index
        ] as CubeStateResponseDto['state'],
      }));
    },
    [cubeId],
  );

  const resetCube = useCallback(async (): Promise<void> => {
    if (cubeId === null || isAnimating || resetInFlightRef.current) return;

    resetInFlightRef.current = true;
    setIsResetting(true);
    setMoveError(false);
    batchedMoveStatesRef.current = [];

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/cubes/${cubeId}/reset`,
        { method: 'PUT' },
      );

      if (!response.ok) {
        throw new Error(`Cube reset failed: ${response.status}`);
      }

      const dto = (await response.json()) as CubeStateResponseDto;

      setCubeState(dto.state);
      setLastMove(null);
      if (commutator !== undefined) setCommutatorBaseState(dto.state);
    } catch (error: unknown) {
      setMoveError(true);
      throw error;
    } finally {
      resetInFlightRef.current = false;
      setIsResetting(false);
    }
  }, [commutator, cubeId, isAnimating]);

  const {
    state: playbackState,
    start: startPlayback,
    play,
    playUntil,
    pause,
    next,
    previous,
    reversePlay,
    reset,
    handleAnimationComplete: completePlaybackAnimation,
  } = usePlayback({
    moves: preparedMoves,
    isAnimating,
    applyMove,
    prepareMoves: prepareMovesForPlayback,
    resetCube,
    sequenceRevision: preparedMovesRevision,
  });

  const prepareCommutator = useCallback(
    async (a: string, b: string): Promise<void> => {
      if (cubeState === null || isAnimating) return;
      setCycleAnalysis(undefined);
      setCycleSelection(undefined);
      setIsCommutatorLoading(true);
      setCommutatorError(undefined);
      try {
        const response = await fetch(`${API_BASE_URL}/api/commutators`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ a, b }),
        });
        if (!response.ok) {
          throw new Error(`Commutator preparation failed: ${response.status}`);
        }
        const dto = (await response.json()) as PreparedCommutatorResponseDto;
        setCommutator(dto);
        setCommutatorBaseState(cubeState);
        setPreparedMoves(dto.moves);
        setPreparedMovesRevision((current) => current + 1);
      } catch {
        setCommutator(undefined);
        setCommutatorBaseState(undefined);
        setCommutatorError('Could not prepare commutator.');
      } finally {
        setIsCommutatorLoading(false);
      }
    },
    [cubeState, isAnimating],
  );

  const activeCommutatorPart = useMemo<CommutatorPartDto | undefined>(() => {
    if (commutator === undefined) return undefined;
    const moveIndex =
      playbackState.direction === 'reverse'
        ? playbackState.currentIndex - 1
        : playbackState.currentIndex;
    return commutator.boundaries.find(
      ({ startIndex, endIndex }) =>
        startIndex <= moveIndex && moveIndex < endIndex,
    )?.part;
  }, [commutator, playbackState.currentIndex, playbackState.direction]);

  const isCommutatorPlaybackReady =
    commutator !== undefined &&
    commutator.moves.length === playbackState.moves.length &&
    commutator.moves.every(
      (move, index) => move === playbackState.moves[index],
    );

  const nextCommutatorPartEnd = useMemo(
    () =>
      (isCommutatorPlaybackReady ? commutator : undefined)?.boundaries.find(
        ({ startIndex, endIndex }) =>
          startIndex <= playbackState.currentIndex &&
          playbackState.currentIndex < endIndex,
      )?.endIndex,
    [commutator, isCommutatorPlaybackReady, playbackState.currentIndex],
  );

  const changedCubieIds = useMemo(
    () =>
      commutatorBaseState === undefined || cubeState === null
        ? []
        : findChangedCubieIds(commutatorBaseState, cubeState),
    [commutatorBaseState, cubeState],
  );

  const clearCommutatorLesson = useCallback((): void => {
    setCommutator(undefined);
    setCommutatorBaseState(undefined);
  }, []);

  const clearCycleLesson = useCallback((): void => {
    setCycleAnalysis(undefined);
    setCycleSelection(undefined);
    setStickerCycleIndex(0);
    setCycleAnalysisError(undefined);
  }, []);

  const clearTeachingLessons = useCallback((): void => {
    clearCommutatorLesson();
    clearCycleLesson();
  }, [clearCommutatorLesson, clearCycleLesson]);

  const analyzeSequence = useCallback(
    async (sequence: string, conjugate = ''): Promise<void> => {
      if (cubeId === null || isAnimating) return;
      setIsCycleAnalysisLoading(true);
      setCycleAnalysisError(undefined);
      clearCommutatorLesson();
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/cubes/${cubeId}/analyses`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sequence,
              ...(conjugate.trim() === '' ? {} : { conjugate }),
            }),
          },
        );
        if (!response.ok) {
          throw new Error(`Sequence analysis failed: ${response.status}`);
        }
        const dto = (await response.json()) as SequenceAnalysisResponseDto;
        setCycleAnalysis(dto);
        setCycleSelection(firstThreeCycle(dto));
        setStickerCycleIndex(0);
        setPreparedMoves(dto.moves);
        setPreparedMovesRevision((current) => current + 1);
      } catch {
        setCycleAnalysis(undefined);
        setCycleSelection(undefined);
        setCycleAnalysisError('Could not analyze sequence.');
      } finally {
        setIsCycleAnalysisLoading(false);
      }
    },
    [clearCommutatorLesson, cubeId, isAnimating],
  );

  const cycleVisualization = useMemo(
    () =>
      cycleAnalysis === undefined
        ? undefined
        : createCycleVisualization(cycleAnalysis, cycleSelection),
    [cycleAnalysis, cycleSelection],
  );
  const cycleStickerMarkers = useMemo(
    () =>
      cycleVisualization === undefined || cubeState === null
        ? undefined
        : createCycleStickerMarkers(
            cubeState,
            cycleVisualization.stickerCycles[stickerCycleIndex],
          ),
    [cubeState, cycleVisualization, stickerCycleIndex],
  );

  const isCyclePlaybackReady =
    cycleAnalysis !== undefined &&
    cycleAnalysis.moves.length === playbackState.moves.length &&
    cycleAnalysis.moves.every(
      (move, index) => move === playbackState.moves[index],
    );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isEditableTarget(event.target)) return;

      const face = event.key.toUpperCase();
      if (!isKeyboardMove(face)) return;

      const move: CubeMove = event.shiftKey ? `${face}'` : face;
      clearTeachingLessons();
      void applyMoveRef.current(move).catch(() => undefined);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearTeachingLessons]);

  const cubeAnimation = useMemo(
    () =>
      lastMove === null
        ? undefined
        : {
            id: animationId,
            move: lastMove,
            durationMs: animationDurationMs,
          },
    [animationDurationMs, animationId, lastMove],
  );

  const handleAnimationComplete = useCallback(
    (completedId: number) => {
      if (completedId !== animationId) return;

      setIsAnimating(false);
      completePlaybackAnimation(completedId);
    },
    [animationId, completePlaybackAnimation],
  );

  const validateMoveSequence = useCallback(async (): Promise<void> => {
    setIsSequenceLoading(true);
    setSequenceError(undefined);
    try {
      const response = await fetch(`${API_BASE_URL}/api/move-sequences`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sequence: sequenceInput }),
      });
      if (!response.ok) {
        throw new Error(`Move sequence validation failed: ${response.status}`);
      }
      const dto = (await response.json()) as MoveSequenceResponseDto;
      clearTeachingLessons();
      setPreparedMoves(dto.moves);
      setPreparedMovesRevision((current) => current + 1);
    } catch {
      setPreparedMoves([]);
      setSequenceError('Could not prepare move sequence.');
    } finally {
      setIsSequenceLoading(false);
    }
  }, [clearTeachingLessons, sequenceInput]);

  const preparePresetPlayback = useCallback(
    async (preset: PresetResponseDto, reverse: boolean): Promise<void> => {
      if (isAnimating || playbackState.status === 'playing') return;
      clearTeachingLessons();
      setSequenceInput(preset.moves);
      setSequenceError(undefined);
      try {
        const response = await fetch(`${API_BASE_URL}/api/move-sequences`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sequence: preset.moves }),
        });
        if (!response.ok) throw new Error('Preset sequence is invalid');
        const dto = (await response.json()) as MoveSequenceResponseDto;
        const moves = reverse ? invertMoves(dto.moves) : dto.moves;
        setPreparedMoves(moves);
        startPlayback(moves);
      } catch {
        setSequenceError('Could not prepare preset playback.');
      }
    },
    [clearTeachingLessons, isAnimating, playbackState.status, startPlayback],
  );

  return (
    <main>
      <h1>Rubik&apos;s Cube Learning</h1>
      {status === 'loading' && <p>Loading cube...</p>}
      {status === 'error' && <p role="alert">Error loading cube.</p>}
      {status === 'ready' && cubeState !== null && (
        <>
          <div className="cube-workspace">
            <CubeView
              state={cubeState}
              animation={cubeAnimation}
              preview={facePreview}
              onAnimationComplete={handleAnimationComplete}
              highlightedCubieIds={
                toolMode === 'analysis'
                  ? (cycleVisualization?.cubieIds ?? changedCubieIds)
                  : []
              }
              dimUnhighlighted={
                toolMode === 'analysis' &&
                (cycleVisualization !== undefined || commutator !== undefined)
              }
              cubieMarkers={
                toolMode === 'analysis' && cycleDisplayMode === 'labels'
                  ? cycleVisualization?.markers
                  : undefined
              }
              stickerMarkers={
                toolMode === 'analysis' && cycleDisplayMode === 'stickers'
                  ? cycleStickerMarkers
                  : undefined
              }
            />
            <div className="cube-controls">
              <AnimationSpeedControl
                value={animationDurationMs}
                onChange={setAnimationDurationMs}
              />
              <ToolModeTabs
                value={toolMode}
                onChange={(mode) => {
                  pause();
                  setFacePreview(null);
                  setToolMode(mode);
                }}
              />
              {toolMode === 'practice' ? (
                <section
                  id="tool-panel-practice"
                  className="tool-mode-panel"
                  role="tabpanel"
                  aria-labelledby="tool-mode-practice"
                >
                  <ManualCubeControls
                    state={cubeState}
                    disabled={isAnimating || isResetting}
                    onMove={(move) => {
                      clearTeachingLessons();
                      void applyMove(move).catch(() => undefined);
                    }}
                    onPreviewChange={setFacePreview}
                    onReset={reset}
                  />
                  <MoveSequenceControl
                    sequenceInput={sequenceInput}
                    preparedMoves={preparedMoves}
                    isLoading={isSequenceLoading}
                    disabled={isAnimating || isResetting}
                    errorMessage={sequenceError}
                    onSequenceInputChange={(value) => {
                      setSequenceInput(value);
                      setSequenceError(undefined);
                    }}
                    onPrepare={() => void validateMoveSequence()}
                    onApplyMove={(move) => {
                      clearTeachingLessons();
                      void applyMove(move).catch(() => undefined);
                    }}
                  />
                  <PlaybackControls
                    currentIndex={playbackState.currentIndex}
                    moveCount={playbackState.moves.length}
                    status={playbackState.status}
                    direction={playbackState.direction}
                    disabled={isAnimating || isResetting}
                    onPlay={play}
                    onPause={pause}
                    onNext={next}
                    onPrevious={previous}
                    onReversePlay={reversePlay}
                    onReset={reset}
                  />
                  <PresetPanel
                    apiBaseUrl={API_BASE_URL}
                    disabled={
                      isAnimating ||
                      isResetting ||
                      playbackState.status === 'playing'
                    }
                    onPlay={(preset) =>
                      void preparePresetPlayback(preset, false)
                    }
                    onReversePlay={(preset) =>
                      void preparePresetPlayback(preset, true)
                    }
                  />
                </section>
              ) : (
                <section
                  id="tool-panel-analysis"
                  className="tool-mode-panel"
                  role="tabpanel"
                  aria-labelledby="tool-mode-analysis"
                >
                  <CommutatorTeachingPanel
                    definition={commutator}
                    activePart={activeCommutatorPart}
                    isLoading={isCommutatorLoading}
                    disabled={
                      isAnimating ||
                      isResetting ||
                      playbackState.status === 'playing'
                    }
                    playDisabled={
                      !isCommutatorPlaybackReady ||
                      playbackState.currentIndex !== 0
                    }
                    playNextDisabled={nextCommutatorPartEnd === undefined}
                    errorMessage={commutatorError}
                    onPrepare={(a, b) => void prepareCommutator(a, b)}
                    onPlay={() => {
                      if (commutator !== undefined) {
                        startPlayback(commutator.moves);
                      }
                    }}
                    onPlayNextPart={() => {
                      if (nextCommutatorPartEnd !== undefined) {
                        playUntil(nextCommutatorPartEnd);
                      }
                    }}
                  />
                  <CycleTeachingPanel
                    result={cycleAnalysis}
                    selection={cycleSelection}
                    displayMode={cycleDisplayMode}
                    stickerCycles={cycleVisualization?.stickerCycles}
                    stickerCycleIndex={stickerCycleIndex}
                    currentIndex={playbackState.currentIndex}
                    moveCount={playbackState.moves.length}
                    status={playbackState.status}
                    direction={playbackState.direction}
                    isLoading={isCycleAnalysisLoading}
                    disabled={isAnimating || isResetting}
                    playbackDisabled={!isCyclePlaybackReady}
                    errorMessage={cycleAnalysisError}
                    onAnalyze={(sequence, conjugate) =>
                      void analyzeSequence(sequence, conjugate)
                    }
                    onClear={() => {
                      pause();
                      clearCycleLesson();
                    }}
                    onSelectCycle={(kind, index) => {
                      setCycleSelection({ kind, index });
                      setStickerCycleIndex(0);
                    }}
                    onDisplayModeChange={setCycleDisplayMode}
                    onStickerCycleIndexChange={setStickerCycleIndex}
                    onNext={next}
                    onPrevious={previous}
                    onPlay={play}
                    onReversePlay={reversePlay}
                  />
                  <div className="analysis-manual-tools">
                    <h2>Playback and manual controls</h2>
                    <PlaybackControls
                      currentIndex={playbackState.currentIndex}
                      moveCount={playbackState.moves.length}
                      status={playbackState.status}
                      direction={playbackState.direction}
                      disabled={isAnimating || isResetting}
                      onPlay={play}
                      onPause={pause}
                      onNext={next}
                      onPrevious={previous}
                      onReversePlay={reversePlay}
                      onReset={reset}
                    />
                    <ManualCubeControls
                      state={cubeState}
                      disabled={isAnimating || isResetting}
                      onMove={(move) => {
                        clearTeachingLessons();
                        void applyMove(move).catch(() => undefined);
                      }}
                      onPreviewChange={setFacePreview}
                      onReset={reset}
                    />
                  </div>
                </section>
              )}
            </div>
          </div>
          {moveError && <p role="alert">Error applying move.</p>}
        </>
      )}
    </main>
  );
}

interface ManualCubeControlsProps {
  readonly state: CubeStateResponseDto['state'];
  readonly disabled: boolean;
  readonly onMove: (move: CubeMove) => void;
  readonly onPreviewChange: (preview: FacePreview | null) => void;
  readonly onReset: () => void;
}

function ManualCubeControls({
  state,
  disabled,
  onMove,
  onPreviewChange,
  onReset,
}: ManualCubeControlsProps) {
  return (
    <>
      <FaceControlPanel
        state={state}
        onMove={onMove}
        onPreviewChange={onPreviewChange}
        disabled={disabled}
      />
      <SliceControlPanel onMove={onMove} disabled={disabled} />
      <button
        className="cube-reset-control"
        type="button"
        disabled={disabled}
        onClick={onReset}
      >
        Reset cube
      </button>
    </>
  );
}

function invertMoves(moves: readonly CubeMove[]): readonly CubeMove[] {
  return [...moves]
    .reverse()
    .map((move) =>
      move.endsWith('2')
        ? move
        : move.endsWith("'")
          ? (move[0] as CubeMove)
          : (`${move}'` as CubeMove),
    );
}

async function getCreatedCube(
  cubeId: string,
  signal: AbortSignal,
): Promise<CubeStateResponseDto> {
  const response = await fetch(`${API_BASE_URL}/api/cubes/${cubeId}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Cube retrieval failed: ${response.status}`);
  }
  return (await response.json()) as CubeStateResponseDto;
}

function isKeyboardMove(value: string): value is KeyboardMove {
  return (KEYBOARD_MOVES as readonly string[]).includes(value);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}
