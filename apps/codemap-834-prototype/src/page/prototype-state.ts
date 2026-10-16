import { useCallback, useMemo, useState } from 'react';
import type { View } from '../code-map';
import { getFiles, type FileEntry } from './dataset';

/** What the prototype page holds; the Code Map owns its camera, labels and readiness. */
export interface PrototypeState {
  files: FileEntry[];
  /** The stress file count from the URL, or 0 for the real snapshot. */
  count: number;
  view: View;
  onView: (view: View) => void;
  selectedId?: string;
  onSelect: (id: string) => void;
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

/** Keeps `?view=` in step with the toggle, so a reload opens the same view. */
function rememberView(view: View): void {
  const url = new URL(location.href);
  url.searchParams.set('view', view);
  history.replaceState(null, '', url);
}

function useData(): Pick<PrototypeState, 'files' | 'count'> {
  const [count] = useState(requestedCount);
  const files = useMemo(() => getFiles(count), [count]);

  return { files, count };
}

function useView(): Pick<PrototypeState, 'view' | 'onView'> {
  const [view, setView] = useState(initialView);

  const onView = useCallback((next: View) => {
    rememberView(next);
    setView(next);
  }, []);

  return { view, onView };
}

function useSelection(): Pick<PrototypeState, 'selectedId' | 'onSelect'> {
  const [selectedId, onSelect] = useState<string>();

  return { selectedId, onSelect };
}

export function usePrototypeState(): PrototypeState {
  return { ...useData(), ...useView(), ...useSelection() };
}
