import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createColorMap,
  DEFAULT_ORIENTATION,
  isCubeOrientation,
  type CubeOrientation,
} from './cubeColorScheme';

const STORAGE_KEY = 'cube-learning.orientation.v1';
const CubeColorSchemeContext = createContext<{
  orientation: CubeOrientation;
  colorMap: ReturnType<typeof createColorMap>;
  setOrientation: (orientation: CubeOrientation) => void;
  storageError: string;
}>({
  orientation: DEFAULT_ORIENTATION,
  colorMap: createColorMap(DEFAULT_ORIENTATION),
  setOrientation: () => {},
  storageError: '',
});

function loadOrientation(): CubeOrientation {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    );
    if (isCubeOrientation(saved)) return { up: saved.up, front: saved.front };
  } catch {
    /* Unavailable or invalid storage uses the standard orientation. */
  }
  return DEFAULT_ORIENTATION;
}

export function CubeColorSchemeProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [orientation, setValue] = useState(loadOrientation);
  const [storageError, setStorageError] = useState('');
  const colorMap = useMemo(() => createColorMap(orientation), [orientation]);
  const setOrientation = (next: CubeOrientation) => {
    if (!isCubeOrientation(next)) return;
    setValue(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError(
        '配色を保存できません。画面を開いている間は使用できます。',
      );
    }
  };
  return (
    <CubeColorSchemeContext.Provider
      value={{ orientation, colorMap, setOrientation, storageError }}
    >
      {children}
    </CubeColorSchemeContext.Provider>
  );
}

export const useCubeColorScheme = () => useContext(CubeColorSchemeContext);
