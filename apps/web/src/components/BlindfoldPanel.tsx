import { useState } from 'react';
import type { Face } from '@rubiks-learning/cube-core';
import type { CubeViewState } from './cubeViewModel';
import {
  analyzeBlindfold,
  checkMemo,
  formatMemo,
  netSticker,
  normalizeSticker,
  parseMemo,
  stickers,
  validateLabels,
} from '../analysis/blindfold';
import './blindfold-panel.css';

const STORAGE_KEY = 'cube-learning.3bld.v1';
const KINDS = ['edge', 'corner'] as const;
const NAMES = { edge: 'エッジ', corner: 'コーナー' };
const FACES: Face[] = ['U', 'L', 'F', 'R', 'B', 'D'];
interface Settings {
  labels: Record<string, string>;
  edge: string;
  corner: string;
  includeOrientation: boolean;
}
function loadSettings(): Settings {
  const defaults: Settings = {
    labels: Object.fromEntries(
      KINDS.flatMap((kind) =>
        stickers(kind).map((s, i) => [s, String.fromCharCode(65 + i)]),
      ),
    ),
    edge: 'UB',
    corner: 'UFR',
    includeOrientation: false,
  };
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as Partial<Settings> | null;
    if (!saved || typeof saved !== 'object') return defaults;
    const labels = { ...defaults.labels };
    for (const s of Object.keys(labels))
      if (typeof saved.labels?.[s] === 'string') labels[s] = saved.labels[s];
    return {
      labels,
      edge: normalizeSticker(saved.edge ?? defaults.edge, 'edge'),
      corner: normalizeSticker(saved.corner ?? defaults.corner, 'corner'),
      includeOrientation: saved.includeOrientation === true,
    };
  } catch {
    return defaults;
  }
}

interface Props {
  state: CubeViewState;
  disabled: boolean;
  onScramble: () => Promise<string>;
}
interface Analysis {
  targets: string[];
  orientations: string[];
}
export function BlindfoldPanel({ state, disabled, onScramble }: Props) {
  const [settings, setSettings] = useState(loadSettings);
  const [memo, setMemo] = useState({ edge: '', corner: '' });
  const [mode, setMode] = useState<'analysis' | 'practice'>('analysis');
  const [result, setResult] = useState<{
    key: string;
    edge: Analysis;
    corner: Analysis;
  }>();
  const [judgment, setJudgment] = useState<{
    key: string;
    messages: string[];
  }>();
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [scrambling, setScrambling] = useState(false);
  const [scramble, setScramble] = useState('');
  const key = JSON.stringify([state, settings]);
  const judgeKey = JSON.stringify([key, memo]);
  const busy = disabled || scrambling;
  const update = (next: Settings) => {
    setSettings(next);
    setError('');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError(
        '設定を保存できません。このタブを開いている間は使用できます。',
      );
    }
  };
  const analyze = () => {
    setError('');
    try {
      KINDS.forEach((kind) => validateLabels(settings.labels, kind));
      setResult({
        key,
        edge: analyzeBlindfold(
          state,
          'edge',
          settings.edge,
          settings.includeOrientation,
        ),
        corner: analyzeBlindfold(
          state,
          'corner',
          settings.corner,
          settings.includeOrientation,
        ),
      });
    } catch (e) {
      setResult(undefined);
      setError(e instanceof Error ? e.message : '分析できませんでした。');
    }
  };
  const judge = () => {
    setError('');
    try {
      const messages = KINDS.map((kind) => {
        const targets = parseMemo(memo[kind], settings.labels, kind);
        const checked = checkMemo(
          state,
          kind,
          settings[kind],
          targets,
          settings.includeOrientation,
        );
        return `${NAMES[kind]}: ${checked.solved ? (settings.includeOrientation ? '正解（向きまで完成）' : '正解（配置が完成）') : '未完成'} ／ ${targets.length}互換${!settings.includeOrientation ? ` ／ 残る向き: ${checked.orientations.join('、') || 'なし'}` : ''}`;
      });
      setJudgment({ key: judgeKey, messages });
    } catch (e) {
      setJudgment(undefined);
      setError(e instanceof Error ? e.message : '判定できませんでした。');
    }
  };
  return (
    <div className="blindfold-panel">
      <h2>3BLD · 互換列の分析</h2>
      <p>
        現在のキューブを分析します。各面のセンターを基準に、バッファと交換先のステッカーを合わせてピースごと交換します。
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setScrambling(true);
          setError('');
          setResult(undefined);
          setJudgment(undefined);
          setScramble('');
          try {
            setScramble(await onScramble());
          } catch {
            setError('スクランブルに失敗しました。もう一度お試しください。');
          } finally {
            setScrambling(false);
          }
        }}
      >
        {scrambling ? 'スクランブル中…' : 'ランダムスクランブル'}
      </button>
      <p className="blindfold-help">
        完成状態にリセットしてから、ランダムな25手を適用します。
      </p>
      {scramble && (
        <section aria-label="スクランブル手順">
          <h3>スクランブル手順</h3>
          <p className="blindfold-help">
            手元のキューブを完成状態にし、白を上（U）、緑を前（F）にして、左から順に回してください。
          </p>
          <p>{scramble}</p>
        </section>
      )}
      <fieldset disabled={busy}>
        <legend>バッファと文字割り当て</legend>
        <div className="blindfold-buffers">
          {KINDS.map((kind) => (
            <label key={kind}>
              {NAMES[kind]}バッファ
              <input
                aria-label={`${NAMES[kind]}バッファ`}
                value={settings[kind]}
                onChange={(e) =>
                  update({ ...settings, [kind]: e.target.value.toUpperCase() })
                }
              />
            </label>
          ))}
        </div>
        <p className="blindfold-help">
          位置名ボタンでバッファを選択できます。先頭の面が対象ステッカーです（UBとBUは別）。文字は同じ種類内で重複不可。複数文字のメモは空白で区切ります。
        </p>
        <div className="blindfold-net-scroll">
          <div className="blindfold-net" aria-label="文字割り当ての展開図">
            {FACES.map((face) => (
              <div
                key={face}
                className={`blindfold-face blindfold-face-${face}`}
                aria-label={`${face}面`}
              >
                {state.faces[face].map((color, i) => {
                  const s = netSticker(face, i);
                  if (!s)
                    return (
                      <div
                        key={i}
                        className="blindfold-sticker blindfold-center"
                        style={{ backgroundColor: color }}
                      >
                        {face}
                      </div>
                    );
                  const kind = s.length === 2 ? 'edge' : 'corner';
                  let selected = false;
                  try {
                    selected = normalizeSticker(settings[kind], kind) === s;
                  } catch {
                    /* Keep invalid text editable. */
                  }
                  return (
                    <div
                      key={i}
                      className="blindfold-sticker"
                      data-selected={selected}
                      style={{ backgroundColor: color }}
                    >
                      <button
                        type="button"
                        aria-label={`${s}をバッファに設定`}
                        aria-pressed={selected}
                        onClick={() => update({ ...settings, [kind]: s })}
                      >
                        {s}
                        {selected ? ' ●' : ''}
                      </button>
                      <input
                        aria-label={`${s}の文字`}
                        value={settings.labels[s] ?? ''}
                        onChange={(e) =>
                          update({
                            ...settings,
                            labels: { ...settings.labels, [s]: e.target.value },
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <label>
          <input
            type="checkbox"
            checked={settings.includeOrientation}
            onChange={(e) =>
              update({ ...settings, includeOrientation: e.target.checked })
            }
          />{' '}
          反転・ねじれも互換列に含める
        </label>
        <p className="blindfold-help">
          オフ: 配置が完成すれば正解とし、残る反転・ねじれを別表示します。オン:
          向きまで完成することを判定します。「位置 ←
          ステッカー」は、その位置に残っているステッカーを表します。
        </p>
      </fieldset>
      {storageError && <p role="status">{storageError}</p>}
      <label>
        モード{' '}
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as typeof mode);
            setResult(undefined);
            setJudgment(undefined);
            setError('');
          }}
        >
          <option value="analysis">分析</option>
          <option value="practice">メモ練習</option>
        </select>
      </label>
      {mode === 'practice' && (
        <div className="blindfold-practice">
          {KINDS.map((kind) => (
            <label key={kind}>
              {NAMES[kind]}メモ
              <textarea
                aria-label={`${NAMES[kind]}メモ`}
                value={memo[kind]}
                onChange={(e) => setMemo({ ...memo, [kind]: e.target.value })}
              />
            </label>
          ))}
          <button type="button" disabled={busy} onClick={judge}>
            メモを判定
          </button>
          <p className="blindfold-help">
            バッファの文字を省略して交換先を順に入力します。循環に入る順序・起点が違っても、入力した互換列の結果で判定します。
          </p>
          {judgment?.key === judgeKey && (
            <div role="status">
              {judgment.messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
        </div>
      )}
      <button type="button" disabled={busy} onClick={analyze}>
        {mode === 'practice' ? '分析結果を見る' : '分析'}
      </button>
      {error && <p role="alert">{error}</p>}
      {result?.key === key && (
        <div className="blindfold-results">
          {KINDS.map((kind) => (
            <section key={kind} aria-label={`${NAMES[kind]}分析結果`}>
              <h3>
                {NAMES[kind]} ／ {result[kind].targets.length}互換
              </h3>
              <p className="blindfold-memo">
                {formatMemo(result[kind].targets, settings.labels, kind) ||
                  '（交換なし）'}
              </p>
              <p>
                残る{kind === 'edge' ? '反転' : 'ねじれ'}:{' '}
                {result[kind].orientations.join('、') || 'なし'}
              </p>
              <details>
                <summary>互換列の詳細</summary>
                <table>
                  <thead>
                    <tr>
                      <th>順番</th>
                      <th>互換</th>
                      <th>文字</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result[kind].targets.map((s, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          ({normalizeSticker(settings[kind], kind)}, {s})
                        </td>
                        <td>{settings.labels[s]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
