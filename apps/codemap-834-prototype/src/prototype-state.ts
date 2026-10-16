import { useCallback, useMemo, useRef, useState } from 'react';
import {
  labels as recordLabels,
  pending,
  ready,
  selected as recordSelection,
} from './evidence';
import {
  getFiles,
  layout,
  type Label,
  type MapProps,
  type RendererInfo,
  type View,
} from './model';
import { runCamera, type CameraAction, type Viewport } from './viewport';

export interface PrototypeState extends Omit<MapProps, 'palette'> {
  files: ReturnType<typeof getFiles>;
  count: number;
  view: View;
  labels: Label[];
  info?: RendererInfo;
  onView: (view: View) => void;
  onCamera: (action: CameraAction) => void;
}

const stressCounts = { small: 5000, large: 20000 };

function search(): string {
  return typeof location === 'undefined' ? '' : location.search;
}

function requestedCount(): number {
  const requested = new URLSearchParams(search()).get('files');

  if (requested === '5000') return stressCounts.small;

  if (requested === '20000') return stressCounts.large;

  return 0;
}

function initialView(): View {
  return new URLSearchParams(search()).get('view') === 'flat' ? 'flat' : '3d';
}

function useData(): Pick<PrototypeState, 'files' | 'tiles' | 'count'> {
  const [count] = useState(requestedCount);
  const files = useMemo(() => getFiles(count), [count]);
  const tiles = useMemo(() => layout(files), [files]);

  return { files, tiles, count };
}

function useSelection(): Pick<PrototypeState, 'selected' | 'onSelect'> {
  const [selected, setSelected] = useState<string>();

  const onSelect = useCallback(
    (id: string) => setSelected(recordSelection(id)),
    [],
  );

  return { selected, onSelect };
}

function useLabels(): Pick<PrototypeState, 'labels' | 'onLabels'> {
  const [labels, setLabels] = useState<Label[]>([]);

  const onLabels = useCallback(
    (next: Label[]) => setLabels(recordLabels(next)),
    [],
  );

  return { labels, onLabels };
}

function useReadiness(view: View): Pick<PrototypeState, 'info' | 'onReady'> {
  const [info, setInfo] = useState<RendererInfo>();

  const onReady = useCallback(
    (value: RendererInfo) => setInfo(ready(view, value)),
    [view],
  );

  return { info, onReady };
}

function useCamera(): Pick<PrototypeState, 'viewportRef' | 'onCamera'> {
  const viewportRef = useRef<Viewport | null>(null);

  const onCamera = useCallback(
    (action: CameraAction) => runCamera(viewportRef.current, action),
    [],
  );

  return { viewportRef, onCamera };
}

function useView(
  onLabels: PrototypeState['onLabels'],
): Pick<PrototypeState, 'view' | 'onView'> {
  const [view, setView] = useState(initialView);

  const onView = useCallback(
    (next: View) => {
      if (next === view) return;
      pending(next);
      onLabels([]);
      setView(next);
    },
    [view, onLabels],
  );

  return { view, onView };
}

export function usePrototypeState(): PrototypeState {
  const data = useData();
  const labels = useLabels();
  const views = useView(labels.onLabels);
  const selection = useSelection();

  return {
    ...data,
    ...labels,
    ...views,
    ...selection,
    ...useReadiness(views.view),
    ...useCamera(),
  };
}
