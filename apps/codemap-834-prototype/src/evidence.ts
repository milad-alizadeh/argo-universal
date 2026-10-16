import { panDuration } from './frame-sample';
import type { Label, PanResult, RendererInfo, View } from './model';

interface Evidence {
  threeImportMs?: number;
  ready?: boolean;
  view?: View;
  mountMs?: number;
  info?: RendererInfo;
  selectedId?: string;
  labels?: number;
  pan: (duration?: number) => Promise<PanResult>;
}

declare global {
  interface Window {
    __codemap834: Evidence;
    __mapPan834?: (duration: number) => Promise<PanResult>;
  }
}

const mountStart = performance.now();

function pan(duration = panDuration): Promise<PanResult> {
  const handler = window.__mapPan834;

  if (!handler)
    return Promise.reject(new Error('CodeMap renderer is not ready'));

  return handler(duration);
}

if (typeof window !== 'undefined') window.__codemap834 = { pan };

export function ready(view: View, info: RendererInfo): RendererInfo {
  Object.assign(window.__codemap834, {
    ready: true,
    view,
    info,
    mountMs: performance.now() - mountStart,
  });

  return info;
}

export function selected(id: string): string {
  window.__codemap834.selectedId = id;

  return id;
}

export function labels(next: Label[]): Label[] {
  window.__codemap834.labels = next.length;

  return next;
}

export function pending(view: View): void {
  window.__codemap834.ready = false;
  const url = new URL(location.href);
  url.searchParams.set('view', view);
  history.replaceState(null, '', url);
}
