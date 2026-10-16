/*
 * Measurement harness only. The Code Map reports what it drew to this observer; the collector in
 * scripts/ reads the same record from `window.__codemap834`, and the page's diagnostics subscribe.
 */
import type { PanResult, RendererInfo, View } from './model';

export interface Evidence {
  threeImportMs?: number;
  /** True once the mounted view's first frame is on screen. */
  ready?: boolean;
  view?: View;
  mountMs?: number;
  info?: RendererInfo;
  selectedId?: string;
  labels?: number;
  pan: (duration?: number) => Promise<PanResult>;
}

export interface EvidenceObserver {
  /** A new view is mounting: not ready, no labels yet. */
  pending: () => void;
  ready: (view: View, info: RendererInfo) => void;
  selected: (id: string) => void;
  labels: (count: number) => void;
  subscribe: (listener: () => void) => () => void;
}

type Change = Partial<Omit<Evidence, 'pan'>>;

interface Store {
  record: Evidence;
  listeners: Set<() => void>;
}

function write(store: Store, change: Change): void {
  Object.assign(store.record, change);

  for (const listener of store.listeners) listener();
}

function subscribe(store: Store, listener: () => void): () => void {
  store.listeners.add(listener);

  return (): void => {
    store.listeners.delete(listener);
  };
}

function labels(store: Store, count: number): void {
  if (store.record.labels !== count) write(store, { labels: count });
}

/** Writes into `record` and notifies subscribers; `mountMs` reads the elapsed time since mount. */
export function observeEvidence(
  record: Evidence,
  mountMs: () => number,
): EvidenceObserver {
  const store: Store = { record, listeners: new Set() };

  return {
    pending: () => write(store, { ready: false, labels: 0 }),
    ready: (view, info) =>
      write(store, { ready: true, view, info, mountMs: mountMs() }),
    selected: (id) => write(store, { selectedId: id }),
    labels: (count) => labels(store, count),
    subscribe: (listener) => subscribe(store, listener),
  };
}
