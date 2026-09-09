import type {
  PresetResponseDto,
  UpdatePresetRequestDto,
} from '@rubiks-learning/api-contract';
import { useState } from 'react';
import type { PresetStatus } from '../presets';
import './preset-manager.css';
export interface PresetManagerProps {
  readonly presets: readonly PresetResponseDto[];
  readonly status: PresetStatus;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onCreate: (input: { name: string; moves: string }) => void;
  readonly onUpdate: (id: string, input: UpdatePresetRequestDto) => void;
  readonly onDelete: (id: string) => void;
  readonly onPlay: (preset: PresetResponseDto) => void;
  readonly onReversePlay: (preset: PresetResponseDto) => void;
}
export function PresetManager({
  presets,
  status,
  error,
  disabled = false,
  onCreate,
  onUpdate,
  onDelete,
  onPlay,
  onReversePlay,
}: PresetManagerProps) {
  const [name, setName] = useState('');
  const [moves, setMoves] = useState('');
  const busy = disabled || status === 'loading' || status === 'saving';
  return (
    <section className="preset-manager" aria-labelledby="preset-title">
      <h2 id="preset-title">Presets</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onCreate({ name, moves });
        }}
      >
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Moves
          <input
            value={moves}
            onChange={(e) => setMoves(e.target.value)}
            placeholder="R U R' U'"
          />
        </label>
        <button disabled={busy || name.trim() === ''}>Save preset</button>
      </form>
      {status === 'loading' && <p>Loading presets…</p>}
      {status === 'saving' && <p>Saving preset…</p>}
      {error && <p role="alert">{error}</p>}
      {status !== 'loading' && presets.length === 0 && <p>No presets yet.</p>}
      <ul>
        {presets.map((preset) => (
          <PresetItem
            key={preset.id}
            preset={preset}
            busy={busy}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onPlay={onPlay}
            onReversePlay={onReversePlay}
          />
        ))}
      </ul>
    </section>
  );
}
function PresetItem({
  preset,
  busy,
  onUpdate,
  onDelete,
  onPlay,
  onReversePlay,
}: {
  preset: PresetResponseDto;
  busy: boolean;
  onUpdate: PresetManagerProps['onUpdate'];
  onDelete: PresetManagerProps['onDelete'];
  onPlay: PresetManagerProps['onPlay'];
  onReversePlay: PresetManagerProps['onReversePlay'];
}) {
  const [name, setName] = useState(preset.name);
  const [moves, setMoves] = useState(preset.moves);
  return (
    <li>
      <label>
        Name
        <input
          aria-label={`Name ${preset.name}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Moves
        <input
          aria-label={`Moves ${preset.name}`}
          value={moves}
          onChange={(e) => setMoves(e.target.value)}
        />
      </label>
      <div>
        <button
          disabled={busy}
          onClick={() => onUpdate(preset.id, { name, moves })}
        >
          Update
        </button>
        <button disabled={busy} onClick={() => onDelete(preset.id)}>
          Delete
        </button>
        <button
          disabled={busy}
          onClick={() => onPlay({ ...preset, name, moves })}
        >
          Play
        </button>
        <button
          disabled={busy}
          onClick={() => onReversePlay({ ...preset, name, moves })}
        >
          Reverse Play
        </button>
      </div>
    </li>
  );
}
