import {
  startParitySession,
  answerParitySession,
  permutationParity,
  type Parity,
  type ParitySession,
} from './tutorial/parityQuiz';
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
  TutorialPanel,
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
import { CubeCameraControl } from './components/CubeCameraControl';
import type { CubeCameraView } from './components/CubeView';
import './components/face-controls.css';
import { ToolModeTabs, type ToolMode } from './components/ToolModeTabs';
import { BlindfoldPanel } from './components/BlindfoldPanel';
import { randomScramble } from './analysis/blindfold';
import { usePlayback } from './playback/usePlayback';
import {
  evaluateTutorialProgress,
  moveViolatesFix,
  piecePosition,
  stickerLocation,
  trackedPieceView,
  trackedStickerMarker,
  TUTORIAL_PROBLEM_GROUPS,
  TUTORIAL_PROBLEMS,
} from './tutorial/tutorialProblems';

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
  const [cameraView, setCameraView] = useState<CubeCameraView>('UFR');
  const [freeCamera, setFreeCamera] = useState(false);
  const [tutorialProblemIndex, setTutorialProblemIndex] = useState(0);
  const [paritySession, setParitySession] = useState<ParitySession | null>(
    null,
  );
  const [tutorialStartState, setTutorialStartState] = useState<
    CubeStateResponseDto['state'] | null
  >(null);
  const [tutorialMoves, setTutorialMoves] = useState<readonly CubeMove[]>([]);
  const [tutorialStates, setTutorialStates] = useState<
    readonly CubeStateResponseDto['state'][]
  >([]);
  const [clearedTutorialIds, setClearedTutorialIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [tutorialNotice, setTutorialNotice] = useState<string>();
  const solvedStateRef = useRef<CubeStateResponseDto['state'] | null>(null);
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
        solvedStateRef.current = stateDto.state;
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
    async (move: CubeMove): Promise<CubeStateResponseDto['state']> => {
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
          return prepared.state;
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
        return dto.state;
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
    applyMove: async (move) => {
      await applyMove(move);
    },
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

  const scrambleForBlindfold = async (): Promise<string> => {
    if (
      cubeId === null ||
      isAnimating ||
      resetInFlightRef.current ||
      playbackState.status === 'playing'
    )
      throw new Error('Cube is busy');
    resetInFlightRef.current = true;
    setIsResetting(true);
    pause();
    const moves = randomScramble();
    try {
      const resetResponse = await fetch(
        `${API_BASE_URL}/api/cubes/${cubeId}/reset`,
        { method: 'PUT' },
      );
      if (!resetResponse.ok) throw new Error('Scramble reset failed');
      const resetDto = (await resetResponse.json()) as CubeStateResponseDto;
      // Discard any persisted playback suffix after resetting the cube.
      batchedMoveStatesRef.current = [];
      setCubeState(resetDto.state);
      setLastMove(null);
      setFacePreview(null);
      setPreparedMoves([]);
      setPreparedMovesRevision((current) => current + 1);
      clearTeachingLessons();
      setMoveError(false);
      const response = await fetch(
        `${API_BASE_URL}/api/cubes/${cubeId}/moves`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ moves }),
        },
      );
      if (!response.ok) throw new Error('Scramble failed');
      const dto = (await response.json()) as MoveBatchResponseDto;
      const finalState = dto.states.at(-1);
      if (!finalState) throw new Error('Missing scramble state');
      setCubeState(finalState);
      return moves.join(' ');
    } finally {
      resetInFlightRef.current = false;
      setIsResetting(false);
    }
  };

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

  const tutorialProblem =
    TUTORIAL_PROBLEMS[tutorialProblemIndex] ?? TUTORIAL_PROBLEMS[0]!;
  const tutorialProgress = useMemo(
    () =>
      tutorialStartState === null
        ? {
            goalSatisfied: false,
            viaSatisfied: tutorialProblem.via === undefined,
            restoreSatisfied: tutorialProblem.restore === undefined,
            solved: false,
          }
        : evaluateTutorialProgress(
            tutorialProblem,
            tutorialStartState,
            tutorialStates,
          ),
    [tutorialProblem, tutorialStartState, tutorialStates],
  );

  const startTutorialProblem = useCallback(
    async (problemIndex: number): Promise<void> => {
      if (isAnimating || resetInFlightRef.current) return;
      const selected = TUTORIAL_PROBLEMS[problemIndex];
      if (selected === undefined) return;
      setTutorialProblemIndex(problemIndex);
      setFacePreview(null);
      setLastMove(null);
      if (selected.parity !== undefined) {
        setParitySession(startParitySession(selected.parity));
        setTutorialStartState(solvedStateRef.current);
        return;
      }
      setParitySession(null);
      setTutorialMoves([]);
      setTutorialStates([]);
      setTutorialNotice(undefined);
      try {
        await resetCube();
        setTutorialStartState(solvedStateRef.current);
      } catch {
        setTutorialStartState(null);
      }
    },
    [isAnimating, resetCube],
  );

  const applyTutorialMove = useCallback(
    async (move: CubeMove): Promise<void> => {
      if (
        tutorialProblem.kind === 'parity' ||
        tutorialStartState === null ||
        cubeState === null
      )
        return;
      if (
        moveViolatesFix(tutorialProblem, tutorialStartState, cubeState, move)
      ) {
        setFacePreview(null);
        setTutorialNotice(
          `Fix: ${tutorialProblem.fix}を動かす手は使えません。`,
        );
        return;
      }

      setTutorialNotice(undefined);
      try {
        const nextState = await applyMove(move);
        const nextStates = [...tutorialStates, nextState];
        setTutorialMoves((current) => [...current, move]);
        setTutorialStates(nextStates);
        if (
          evaluateTutorialProgress(
            tutorialProblem,
            tutorialStartState,
            nextStates,
          ).solved
        ) {
          setClearedTutorialIds(
            (current) => new Set([...current, tutorialProblem.id]),
          );
        }
      } catch {
        // applyMoveが共通のエラー表示を更新する。
      }
    },
    [applyMove, cubeState, tutorialProblem, tutorialStartState, tutorialStates],
  );
  const applyTutorialMoveRef = useRef(applyTutorialMove);
  applyTutorialMoveRef.current = applyTutorialMove;

  const previousTutorialMove = useCallback(async (): Promise<void> => {
    const previousMove = tutorialMoves.at(-1);
    if (previousMove === undefined) return;
    setTutorialNotice(undefined);
    try {
      await applyMove(invertMove(previousMove));
      setTutorialMoves((current) => current.slice(0, -1));
      setTutorialStates((current) => current.slice(0, -1));
    } catch {
      // applyMoveが共通のエラー表示を更新する。
    }
  }, [applyMove, tutorialMoves]);

  const tutorialPiece = useMemo(
    () =>
      tutorialProblem.kind === 'parity' ||
      tutorialStartState === null ||
      cubeState === null
        ? undefined
        : trackedPieceView(
            tutorialStartState,
            cubeState,
            tutorialProblem.start,
          ),
    [
      cubeState,
      tutorialProblem.kind,
      tutorialProblem.start,
      tutorialStartState,
    ],
  );
  const tutorialMarker = useMemo(
    () =>
      tutorialStartState === null ||
      cubeState === null ||
      tutorialProblem.kind !== 'sticker'
        ? undefined
        : trackedStickerMarker(
            tutorialStartState,
            cubeState,
            tutorialProblem.start,
          ),
    [
      cubeState,
      tutorialProblem.kind,
      tutorialProblem.start,
      tutorialStartState,
    ],
  );
  const tutorialRestoreMarker = useMemo(
    () =>
      tutorialStartState === null ||
      cubeState === null ||
      tutorialProblem.restore === undefined
        ? undefined
        : trackedStickerMarker(
            tutorialStartState,
            cubeState,
            tutorialProblem.restore,
          ),
    [cubeState, tutorialProblem.restore, tutorialStartState],
  );
  const tutorialPositionMarkers = useMemo(
    () =>
      tutorialProblem.kind === 'parity'
        ? []
        : [
            {
              ...(tutorialProblem.kind === 'position'
                ? { position: piecePosition(tutorialProblem.goal) }
                : stickerLocation(tutorialProblem.goal)),
              label: 'G',
              color: '#22c55e',
            },
            ...(tutorialProblem.via === undefined
              ? []
              : [
                  {
                    ...(tutorialProblem.kind === 'position'
                      ? { position: piecePosition(tutorialProblem.via) }
                      : stickerLocation(tutorialProblem.via)),
                    label: 'V',
                    color: '#38bdf8',
                  },
                ]),
            ...(tutorialProblem.fix === undefined
              ? []
              : [
                  {
                    position: piecePosition(tutorialProblem.fix),
                    label: 'F',
                    color: '#fb7185',
                  },
                ]),
            ...(tutorialProblem.restore === undefined
              ? []
              : [
                  {
                    ...stickerLocation(tutorialProblem.restore),
                    label: 'R',
                    color: '#c084fc',
                  },
                ]),
          ],
    [tutorialProblem],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isEditableTarget(event.target)) return;

      const face = event.key.toUpperCase();
      if (!isKeyboardMove(face)) return;

      const move: CubeMove = event.shiftKey ? `${face}'` : face;
      if (toolMode === 'tutorial') {
        void applyTutorialMoveRef.current(move);
        return;
      }
      clearTeachingLessons();
      void applyMoveRef.current(move).catch(() => undefined);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearTeachingLessons, toolMode]);

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

  const parityActive =
    toolMode === 'tutorial' && tutorialProblem.kind === 'parity';
  function answerParity(answer: Parity): void {
    if (
      !parityActive ||
      paritySession === null ||
      tutorialProblem.parity === undefined
    )
      return;
    if (
      permutationParity(paritySession.state, tutorialProblem.parity.pieces) ===
      answer
    ) {
      setClearedTutorialIds(
        (current) => new Set([...current, tutorialProblem.id]),
      );
    }
    setParitySession(
      answerParitySession(paritySession, tutorialProblem.parity, answer),
    );
  }

  return (
    <main>
      <h1>Rubik&apos;s Cube Learning</h1>
      {status === 'loading' && <p>Loading cube...</p>}
      {status === 'error' && <p role="alert">Error loading cube.</p>}
      {status === 'ready' && cubeState !== null && (
        <>
          <div className="cube-workspace">
            <div className="cube-view-column">
              <CubeView
                state={
                  parityActive && paritySession !== null
                    ? paritySession.state
                    : cubeState
                }
                cameraView={cameraView}
                freeCamera={freeCamera}
                animation={parityActive ? undefined : cubeAnimation}
                preview={facePreview}
                onAnimationComplete={handleAnimationComplete}
                highlightedCubieIds={
                  toolMode === 'tutorial' && tutorialPiece !== undefined
                    ? [tutorialPiece.cubieId]
                    : toolMode === 'analysis'
                      ? (cycleVisualization?.cubieIds ?? changedCubieIds)
                      : []
                }
                dimUnhighlighted={
                  toolMode === 'analysis' &&
                  (cycleVisualization !== undefined || commutator !== undefined)
                }
                cubieMarkers={
                  toolMode === 'tutorial' &&
                  tutorialProblem.kind === 'position' &&
                  tutorialPiece !== undefined
                    ? [
                        {
                          cubieId: tutorialPiece.cubieId,
                          label: '●',
                          color: '#facc15',
                        },
                      ]
                    : toolMode === 'analysis' && cycleDisplayMode === 'labels'
                      ? cycleVisualization?.markers
                      : undefined
                }
                stickerMarkers={
                  toolMode === 'tutorial' && tutorialMarker !== undefined
                    ? [
                        {
                          ...tutorialMarker,
                          label: '●',
                          color: '#facc15',
                        },
                        ...(tutorialRestoreMarker === undefined
                          ? []
                          : [
                              {
                                ...tutorialRestoreMarker,
                                label: 'R',
                                color: '#c084fc',
                                opacity: 0.52,
                              },
                            ]),
                      ]
                    : toolMode === 'analysis' && cycleDisplayMode === 'stickers'
                      ? cycleStickerMarkers
                      : undefined
                }
                focusedStickers={
                  toolMode === 'tutorial' && tutorialPiece !== undefined
                    ? [
                        ...(tutorialProblem.kind === 'position'
                          ? tutorialPiece.faces.map((face) => ({
                              cubieId: tutorialPiece.cubieId,
                              face,
                            }))
                          : tutorialMarker === undefined
                            ? []
                            : [tutorialMarker]),
                        ...(tutorialRestoreMarker === undefined
                          ? []
                          : [tutorialRestoreMarker]),
                      ]
                    : undefined
                }
                positionMarkers={
                  toolMode === 'tutorial' ? tutorialPositionMarkers : undefined
                }
              />
              <CubeCameraControl
                value={cameraView}
                disabled={isAnimating}
                freeCamera={freeCamera}
                onFreeCameraChange={setFreeCamera}
                onChange={(view) => {
                  setCameraView(view);
                  setFreeCamera(false);
                }}
              />
            </div>
            <div className="cube-controls">
              <AnimationSpeedControl
                value={animationDurationMs}
                onChange={setAnimationDurationMs}
              />
              <ToolModeTabs
                value={toolMode}
                onChange={(mode) => {
                  if (mode === 'tutorial' && isAnimating) return;
                  pause();
                  setFacePreview(null);
                  setToolMode(mode);
                  if (mode === 'tutorial') {
                    void startTutorialProblem(tutorialProblemIndex);
                  }
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
              ) : toolMode === 'tutorial' ? (
                <section
                  id="tool-panel-tutorial"
                  className="tool-mode-panel"
                  role="tabpanel"
                  aria-labelledby="tool-mode-tutorial"
                >
                  <TutorialPanel
                    problems={TUTORIAL_PROBLEMS}
                    problemGroups={TUTORIAL_PROBLEM_GROUPS}
                    activeIndex={tutorialProblemIndex}
                    clearedProblemIds={clearedTutorialIds}
                    progress={tutorialProgress}
                    moveCount={tutorialMoves.length}
                    state={cubeState}
                    disabled={
                      isAnimating || isResetting || tutorialStartState === null
                    }
                    notice={tutorialNotice}
                    paritySession={paritySession ?? undefined}
                    onParityAnswer={answerParity}
                    onSelect={(index) => void startTutorialProblem(index)}
                    onMove={(move) => void applyTutorialMove(move)}
                    onPreviewChange={setFacePreview}
                    onPrevious={() => void previousTutorialMove()}
                    onReset={() =>
                      void startTutorialProblem(tutorialProblemIndex)
                    }
                  />
                </section>
              ) : toolMode === '3bld' ? (
                <section
                  id="tool-panel-3bld"
                  className="tool-mode-panel"
                  role="tabpanel"
                  aria-labelledby="tool-mode-3bld"
                >
                  <BlindfoldPanel
                    state={cubeState}
                    disabled={
                      isAnimating ||
                      isResetting ||
                      playbackState.status === 'playing'
                    }
                    onScramble={scrambleForBlindfold}
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

function invertMove(move: CubeMove): CubeMove {
  return move.endsWith('2')
    ? move
    : move.endsWith("'")
      ? (move[0] as CubeMove)
      : (`${move}'` as CubeMove);
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
