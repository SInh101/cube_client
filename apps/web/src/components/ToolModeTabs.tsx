import './tool-mode-tabs.css';

export type ToolMode = 'practice' | 'analysis';

export interface ToolModeTabsProps {
  readonly value: ToolMode;
  readonly onChange: (mode: ToolMode) => void;
}

const MODES = [
  { value: 'practice', label: 'Practice' },
  { value: 'analysis', label: 'Analysis' },
] as const;

/** 右カラムの通常操作と教材・解析を切り替える上位navigation。 */
export function ToolModeTabs({ value, onChange }: ToolModeTabsProps) {
  return (
    <div className="tool-mode-tabs" role="tablist" aria-label="Tool mode">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          id={`tool-mode-${mode.value}`}
          type="button"
          role="tab"
          aria-selected={value === mode.value}
          aria-controls={`tool-panel-${mode.value}`}
          tabIndex={value === mode.value ? 0 : -1}
          onClick={() => onChange(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
