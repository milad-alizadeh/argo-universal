import { useCallback, useRef, useState } from 'react';
import { showToast, type ErrorToast } from '#primitives/overlays/toast';

export type ListLoad = () => void | Promise<void>;

export interface ListRequest {
  loading: boolean;
  // Runs `load` unless one is already running.
  run: (load: ListLoad) => Promise<void>;
  // Runs `load` each time, as a move does: each one's failure shows its own toast.
  report: (load: ListLoad) => Promise<void>;
}

// The List is the one reporter of a rejected load: an awaited Plugin event does not toast on its own.
async function loadOrReport(
  load: ListLoad,
  failure: ErrorToast,
): Promise<void> {
  try {
    await load();
  } catch {
    showToast({ ...failure, tone: 'danger' });
  }
}

interface RequestState {
  active: { current: boolean };
  setLoading: (loading: boolean) => void;
}

async function runOnce(
  state: RequestState,
  load: ListLoad,
  failure: ErrorToast,
): Promise<void> {
  if (state.active.current) return;
  state.active.current = true;
  state.setLoading(true);
  await loadOrReport(load, failure);
  state.active.current = false;
  state.setLoading(false);
}

export function useListRequest(failure: ErrorToast): ListRequest {
  const active = useRef(false);
  const [loading, setLoading] = useState(false);

  // Stable, so a declaration built on it registers once.
  const run = useCallback(
    (load: ListLoad) => runOnce({ active, setLoading }, load, failure),
    [failure],
  );

  const report = useCallback(
    (load: ListLoad) => loadOrReport(load, failure),
    [failure],
  );

  return { loading, run, report };
}
