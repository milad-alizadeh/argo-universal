// Throwaway renderer feasibility check, using Atlas Code Map area masters 8G-0 / AU-0 / CZ-0.
// This route intentionally has no Plugin registry or production API.
import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { useNativeTheme } from '../../../packages/client/src/lib/generic/native-theme';
import { Text } from '../../../packages/client/src/lib/generic/primitives/display/text';
import {
  getFiles,
  layout,
  source,
  type Label,
  type MapProps,
  type Palette,
} from './model';

const threeStart = { value: 0 };
const ThreeMap = lazy(async () => {
  threeStart.value = performance.now();
  const result = await import('./three-map.web');
  window.__codemap834.threeImportMs = performance.now() - threeStart.value;
  return result;
});
const FlatLoader = lazy(async () => {
  const { WithSkiaWeb } =
    await import('@shopify/react-native-skia/lib/module/web');
  return {
    default: (props: MapProps) => (
      <WithSkiaWeb
        opts={{ locateFile: (file) => `/codemap-834/${file}` }}
        getComponent={() => import('./flat-map.web')}
        componentProps={props}
        fallback={<Text>Measuring argo-universal</Text>}
      />
    ),
  };
});
interface Evidence {
  threeImportMs?: number;
  ready?: boolean;
  view?: string;
  mountMs?: number;
  info?: Record<string, unknown>;
  selectedId?: string;
  labels?: number;
  pan: (duration?: number) => Promise<Record<string, unknown>>;
}
declare global {
  interface Window {
    __codemap834: Evidence;
  }
}
const mountStart = typeof performance !== 'undefined' ? performance.now() : 0;
if (typeof window !== 'undefined')
  window.__codemap834 = {
    pan: (duration) => window.__mapPan834!(duration ?? 6000),
  };

// Browser resolves oklch/alpha token strings for renderers whose colour parsers accept RGB only.
function rgb(token: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d')!;
  context.fillStyle = token;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${g},${b})`;
}
export default function CodeMap834Prototype() {
  const { colors, colorScheme } = useNativeTheme();
  const params = new URLSearchParams(
    typeof location === 'undefined' ? '' : location.search,
  );
  const requestedCount = params.get('files');
  const count =
    requestedCount === '5000' ? 5000 : requestedCount === '20000' ? 20000 : 0;
  const files = useMemo(() => getFiles(count), [count]);
  const tiles = useMemo(() => layout(files), [files]);
  const [view, setView] = useState(
    params.get('view') === 'flat' ? 'flat' : '3d',
  );
  const [selected, setSelected] = useState<string>();
  const [labels, setLabels] = useState<Label[]>([]);
  const [info, setInfo] = useState<Record<string, unknown>>({});
  const [command, setCommand] = useState({ action: 'fit', key: 0 });
  const palette = useMemo(() => {
    if (
      !colors.card ||
      !colors.foreground ||
      !colors.border ||
      !colors.mutedForeground ||
      !colors.danger ||
      !colors.muted ||
      typeof document === 'undefined'
    )
      return;
    return {
      light: rgb(colorScheme === 'dark' ? colors.foreground : colors.card),
      ...Object.fromEntries(
        [
          'card',
          'foreground',
          'border',
          'mutedForeground',
          'danger',
          'muted',
        ].map((key) => [key, rgb(colors[key as keyof typeof colors]!)]),
      ),
    } as unknown as Palette;
  }, [
    colors.card,
    colors.foreground,
    colors.border,
    colors.mutedForeground,
    colors.danger,
    colors.muted,
    colorScheme,
  ]);
  const onReady = useCallback(
    (value: Record<string, unknown>) => {
      window.__codemap834.ready = true;
      window.__codemap834.info = value;
      window.__codemap834.view = view;
      window.__codemap834.mountMs = performance.now() - mountStart;
      setInfo(value);
    },
    [view],
  );
  const onLabels = useCallback((next: Label[]) => {
    setLabels(next);
    window.__codemap834.labels = next.length;
  }, []);
  const onSelect = useCallback((id: string) => {
    setSelected(id);
    window.__codemap834.selectedId = id;
  }, []);
  if (!palette) return <Text>Measuring argo-universal</Text>;
  const button = {
    border: 0,
    borderRadius: 10,
    padding: '7px 12px',
    color: palette.foreground,
    background: palette.card,
    cursor: 'pointer',
    font: 'inherit',
  };
  const plate = {
    background: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    padding: 5,
    position: 'absolute' as const,
  };
  const props = {
    tiles,
    palette,
    selected,
    onSelect,
    command,
    onLabels,
    onReady,
  };
  return (
    <main
      style={{
        height: '100vh',
        boxSizing: 'border-box',
        padding: 16,
        background: palette.muted,
        color: palette.foreground,
        fontFamily: 'system-ui',
        fontSize: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Text>
        PROTOTYPE #834 · argo-universal · {files.length.toLocaleString()} files{' '}
        {count ? `(stress replicas of ${source.files.length} real files)` : ''}
      </Text>
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 400,
          borderRadius: 18,
          overflow: 'hidden',
          background: palette.card,
          border: `1px solid ${palette.border}`,
        }}
      >
        <Suspense fallback={<Text>Measuring argo-universal</Text>}>
          {view === '3d' ? <ThreeMap {...props} /> : <FlatLoader {...props} />}
        </Suspense>
        <div style={{ ...plate, left: 12, top: 12, display: 'flex', gap: 4 }}>
          {['3d', 'flat'].map((mode) => (
            <button
              key={mode}
              style={{
                ...button,
                background: mode === view ? palette.muted : palette.card,
              }}
              aria-pressed={mode === view}
              onClick={() => {
                if (mode === view) return;
                window.__codemap834.ready = false;
                setLabels([]);
                setView(mode);
                const url = new URL(location.href);
                url.searchParams.set('view', mode);
                history.replaceState(null, '', url);
              }}
            >
              {mode === '3d' ? '3D' : 'Flat'}
            </button>
          ))}
        </div>
        <div
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {labels.map((label) => (
            <div
              key={label.id}
              style={{
                position: 'absolute',
                left: label.x,
                top: label.y,
                maxWidth: 200,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                background: palette.card,
                borderRadius: 4,
                padding: '1px 5px',
              }}
            >
              <Text role="secondary" numberOfLines={1}>
                {label.text}
              </Text>
            </div>
          ))}
        </div>
        <div
          style={{
            ...plate,
            bottom: 12,
            left: 12,
            width: 222,
            padding: 10,
            display: 'grid',
            gap: 10,
          }}
        >
          <div>Area　 Lines of code</div>
          {view === '3d' && <div>Height　 Recent commits</div>}
          <div>Colour　 Lexical branches</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[palette.border, palette.mutedForeground, palette.danger].map(
              (color) => (
                <span
                  key={color}
                  style={{ height: 5, background: color, flex: 1 }}
                />
              ),
            )}
          </div>
          <div style={{ fontSize: 12, color: palette.mutedForeground }}>
            Up to 8　　 9–19　　 20 and up
          </div>
        </div>
        <div style={{ ...plate, right: 12, bottom: 12, display: 'grid' }}>
          {[
            ['in', '+'],
            ['out', '−'],
            ['fit', 'Fit'],
          ].map(([action, label]) => (
            <button
              key={action}
              aria-label={
                action === 'in'
                  ? 'Zoom in'
                  : action === 'out'
                    ? 'Zoom out'
                    : 'Fit'
              }
              style={button}
              onClick={() =>
                setCommand((c) => ({ action: action!, key: c.key + 1 }))
              }
            >
              {label}
            </button>
          ))}
        </div>
        {selected && (
          <div
            style={{
              ...plate,
              top: 12,
              right: 12,
              maxWidth: '50%',
              overflowWrap: 'anywhere',
            }}
          >
            <Text>{selected}</Text>
          </div>
        )}
      </div>
      <Text>
        {view === '3d'
          ? 'Drag to orbit · right-drag to pan · wheel to zoom'
          : 'Drag to pan · wheel to zoom'}{' '}
        · {labels.length} visible labels ·{' '}
        {selected ? `onSelect: ${selected}` : 'Select a file'}
      </Text>
      <div
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
        }}
      >
        <label>
          Accessible file list{' '}
          <select
            aria-label="Code Map files"
            value={selected ?? ''}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="">Select a file</option>
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.path}
              </option>
            ))}
          </select>
        </label>
      </div>
      <output
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: palette.mutedForeground,
        }}
      >
        {JSON.stringify(info)}
      </output>
    </main>
  );
}
