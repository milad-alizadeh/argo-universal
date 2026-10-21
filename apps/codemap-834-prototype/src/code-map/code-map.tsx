/*
 * ADR-0028's `CodeMap`, cut to the props this prototype has data for: no `links` or `trace` yet.
 * Props are plain data a Plugin could send. The Code Map owns everything else: the deferred
 * renderer, its camera and controls, label placement and drawing, palette, readiness and the
 * accessible file list that selects the same file as the canvas.
 */
import { Text } from '@repo/kit/text';
import {
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type JSX,
} from 'react';
import { evidence } from '../evidence';
import { Overlay } from './code-map-overlay';
import { layout } from './layout/treemap';
import { createMapOverlay, type CodeMapOverlay } from './map-overlay';
import { fill } from './map-styles';
import type { CodeMapFile, Palette, RendererProps, View } from './model';
import { usePalette } from './palette';
import { usePlateInsets } from './plates/plate-measure';
import { FlatLoader, ThreeMap } from './renderer-loader.web';
import { drawnView, supports3d } from './webgl';

export interface CodeMapProps {
  /** Names the map for screen readers and stands in while a renderer loads. */
  label: string;
  view: View;
  files: CodeMapFile[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

/** A new view starts a new overlay: no camera, no labels, not drawn, and the evidence marks it pending. */
function useOverlay(view: View): CodeMapOverlay {
  const created = useMemo(
    () =>
      createMapOverlay({
        labels: evidence.labels,
        drawn: (info) => evidence.ready(view, info),
      }),
    [view],
  );

  useLayoutEffect(() => evidence.pending(), [view]);

  return created;
}

/** A stable select handler, so a new page callback never re-renders the renderer. */
function useSelect(onSelect: CodeMapProps['onSelect']): (id: string) => void {
  const latest = useRef(onSelect);
  useLayoutEffect(() => {
    latest.current = onSelect;
  });

  return useCallback((id: string) => {
    evidence.selected(id);
    latest.current?.(id);
  }, []);
}

interface RendererChoice extends RendererProps {
  view: View;
  loading: string;
}

/** Loads only the renderer the view needs; both are memoised, so label moves never reach them. */
function Renderer({ view, loading, ...props }: RendererChoice): JSX.Element {
  return (
    <Suspense fallback={<Text>{loading}</Text>}>
      {view === '3d' ? (
        <ThreeMap {...props} />
      ) : (
        <FlatLoader {...props} fallback={loading} />
      )}
    </Suspense>
  );
}

interface DrawnProps extends CodeMapProps {
  palette: Palette;
  map: CodeMapOverlay;
}

function useRenderer(props: DrawnProps): RendererProps {
  const { files, palette, selectedId, map } = props;
  const tiles = useMemo(() => layout(files), [files]);
  const onSelect = useSelect(props.onSelect);

  const { overlay } = map;

  return { tiles, palette, selected: selectedId, onSelect, overlay };
}

/**
 * Labels stay clear of the plates over the map. A plate is any element the page lays beside the
 * Code Map in its parent, plus the Code Map's own camera plate; it measures them all itself.
 */
function Drawn(props: DrawnProps): JSX.Element {
  const { label, view, map } = props;
  const renderer = useRenderer(props);
  const loading = `Measuring ${label}`;
  const root = useRef<HTMLDivElement>(null);
  usePlateInsets(root, map.cover);

  return (
    <div ref={root} style={fill} role="group" aria-label={label}>
      <Renderer {...renderer} view={view} loading={loading} />
      <Overlay {...props} onSelect={renderer.onSelect} />
    </div>
  );
}

/** Without WebGL the map draws `flat`, whatever view was asked for. */
export function CodeMap(props: CodeMapProps): JSX.Element {
  const view = drawnView(props.view, supports3d());
  const palette = usePalette();
  const map = useOverlay(view);

  if (!palette) return <Text>{`Measuring ${props.label}`}</Text>;

  return <Drawn {...props} view={view} palette={palette} map={map} />;
}
