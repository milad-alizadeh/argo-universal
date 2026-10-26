import { useRef, useState } from 'react';
import { showToast, type ErrorToast } from '#primitives/overlays/toast';

export type ListLoad = () => void | Promise<void>;

export interface ListRequest {
  loading: boolean;
  run: (load: ListLoad) => Promise<void>;
}

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

// Each gesture or edge starts at most one request, including before React paints.
export function useListRequest(failure: ErrorToast): ListRequest {
  const active = useRef(false);
  const [loading, setLoading] = useState(false);

  const run = async (load: ListLoad): Promise<void> => {
    if (active.current) return;
    active.current = true;
    setLoading(true);
    await loadOrReport(load, failure);
    active.current = false;
    setLoading(false);
  };

  return { loading, run };
}
