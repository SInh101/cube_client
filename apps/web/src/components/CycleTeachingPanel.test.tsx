// @vitest-environment jsdom

import type { SequenceAnalysisResponseDto } from '@rubiks-learning/api-contract';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CycleTeachingPanel,
  type CycleTeachingPanelProps,
} from './CycleTeachingPanel';

afterEach(cleanup);

describe('CycleTeachingPanel', () => {
  it('M14-CP-01: 3-cycle、orientation、fixed pieceを表示する', () => {
    renderPanel();
    expect(
      screen
        .getByRole('button', { name: '(URF → DLF → ULB)' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByText('Corner orientation: URF Δ1')).toBeTruthy();
    expect(screen.getByText('Fixed edges: UF')).toBeTruthy();
  });

  it('M14-CP-02: cycleと3D表示モードを選択できる', () => {
    const onSelectCycle = vi.fn();
    const onDisplayModeChange = vi.fn();
    renderPanel({ onSelectCycle, onDisplayModeChange });
    fireEvent.click(screen.getByRole('button', { name: '(URF → DLF → ULB)' }));
    fireEvent.click(
      screen.getByRole('radio', { name: 'Show position labels' }),
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Visualize stickers' }));
    expect(onSelectCycle).toHaveBeenCalledWith('corner', 0);
    expect(onDisplayModeChange).toHaveBeenCalledWith('labels');
    expect(onDisplayModeChange).toHaveBeenCalledWith('stickers');
  });

  it('M14-CP-03: playback未同期時は再生操作だけを無効にする', () => {
    renderPanel({ playbackDisabled: true });
    expect(
      (screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: 'Analyze sequence',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it('M14-CP-04: 3本のsticker cycleを切り替える', () => {
    const onStickerCycleIndexChange = vi.fn();
    renderPanel({
      displayMode: 'stickers',
      stickerCycles: stickerCycles(),
      onStickerCycleIndexChange,
    });
    const second = screen.getByRole('button', {
      name: 'FUR → DLF → BUL',
    });
    fireEvent.click(second);
    expect(onStickerCycleIndexChange).toHaveBeenCalledWith(1);
  });

  it('M14-CP-05: 解析表示を閉じられる', () => {
    const onClear = vi.fn();
    renderPanel({ onClear });
    fireEvent.click(screen.getByRole('button', { name: 'Close analysis' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('共役操作を解析へ渡し、移動前後と3-cycle保存判定を表示する', () => {
    const onAnalyze = vi.fn();
    const baseResult = fixture();
    const result: SequenceAnalysisResponseDto = {
      ...baseResult,
      conjugation: {
        setupSequence: 'U',
        inverseSetupSequence: "U'",
        baseSequence: baseResult.sequence,
        conjugatedSequence: `U ${baseResult.sequence} U'`,
        baseAnalysis: baseResult.analysis,
        preservesThreeCycle: true,
      },
    };
    renderPanel({ result, onAnalyze });
    fireEvent.change(screen.getByLabelText('Conjugate setup (X)'), {
      target: { value: 'U' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze sequence' }));
    expect(onAnalyze).toHaveBeenCalledWith("R' D R U2 R' D' R U2", 'U');
    expect(screen.getByText(/Base position:/)).toBeTruthy();
    expect(screen.getByText(/Shifted position:/)).toBeTruthy();
    expect(screen.getByText('Pure 3-cycle preserved')).toBeTruthy();
  });
});

function renderPanel(overrides: Partial<CycleTeachingPanelProps> = {}): void {
  render(
    <CycleTeachingPanel
      result={fixture()}
      selection={{ kind: 'corner', index: 0 }}
      displayMode="highlight"
      stickerCycleIndex={0}
      currentIndex={0}
      moveCount={3}
      status="idle"
      direction="forward"
      isLoading={false}
      onAnalyze={vi.fn()}
      onClear={vi.fn()}
      onSelectCycle={vi.fn()}
      onDisplayModeChange={vi.fn()}
      onStickerCycleIndexChange={vi.fn()}
      onNext={vi.fn()}
      onPrevious={vi.fn()}
      onPlay={vi.fn()}
      onReversePlay={vi.fn()}
      {...overrides}
    />,
  );
}

function stickerCycles(): NonNullable<
  CycleTeachingPanelProps['stickerCycles']
> {
  const labels = [
    ['URF', 'LDF', 'ULB'],
    ['FUR', 'DLF', 'BUL'],
    ['RUF', 'FDL', 'LUB'],
  ] as const;
  return labels.map((cycleLabels) => ({
    labels: cycleLabels,
    members: [
      { cubieId: 'one', color: 'white' },
      { cubieId: 'two', color: 'orange' },
      { cubieId: 'three', color: 'white' },
    ],
  }));
}

function fixture(): SequenceAnalysisResponseDto {
  const group = {
    identity: false,
    permutation: [],
    cycles: [['URF', 'DLF', 'ULB']],
    threeCycles: [['URF', 'DLF', 'ULB']] as [string, string, string][],
    fixedCubieLabels: [],
    orientationChanges: [
      {
        cubieId: 'piece-1',
        from: [1, 1, 1] as const,
        to: [1, 1, 1] as const,
        fromLabel: 'URF',
        toLabel: 'URF',
        delta: 1 as const,
      },
    ],
  };
  return {
    cubeId: 'cube',
    state: {} as SequenceAnalysisResponseDto['state'],
    sequence: 'R U F',
    moves: ['R', 'U', 'F'],
    resultState: {} as SequenceAnalysisResponseDto['resultState'],
    analysis: {
      identity: false,
      corners: group,
      edges: {
        ...group,
        identity: true,
        cycles: [],
        threeCycles: [],
        fixedCubieLabels: ['UF'],
        orientationChanges: [],
      },
    },
  };
}
