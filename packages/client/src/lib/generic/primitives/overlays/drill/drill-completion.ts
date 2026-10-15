import { useLayoutEffect, useMemo, useRef } from 'react';

export type Completion = { begin: () => void; finish: () => void };

export function useCompletion(onClose?: () => void): Completion {
  const active = useRef(false);
  const latest = useLatestCompletion(onClose);

  return useMemo(
    () => ({
      begin: (): void => {
        active.current = true;
      },
      finish: (): void => finishCompletion(active, latest),
    }),
    [latest],
  );
}

function useLatestCompletion(
  onClose?: () => void,
): React.RefObject<(() => void) | undefined> {
  const latest = useRef(onClose);
  useLayoutEffect(() => {
    latest.current = onClose;
  }, [onClose]);

  return latest;
}

function finishCompletion(
  active: React.RefObject<boolean>,
  latest: React.RefObject<(() => void) | undefined>,
): void {
  if (!active.current) return;
  active.current = false;
  latest.current?.();
}
