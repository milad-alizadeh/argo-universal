import { useSyncExternalStore } from 'react';
import {
  observeEvidence,
  type Evidence,
  type EvidenceObserver,
} from './evidence-store';
import { panDuration } from './frame-sample';
import type { PanResult } from './model';

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

const record: Evidence = { pan };

if (typeof window !== 'undefined') window.__codemap834 = record;

/** The measurement record the collector reads; the Code Map reports into it. */
export const evidence: EvidenceObserver = observeEvidence(
  record,
  () => performance.now() - mountStart,
);

/** Reads one value of the measurement record and re-renders only when it changes. */
export function useEvidence<Value>(read: (record: Evidence) => Value): Value {
  return useSyncExternalStore(evidence.subscribe, () => read(record));
}
