import * as React from 'react';

const closeGraceMs = 50;

export interface HoverTimer {
  close: () => void;
  cancel: () => void;
  schedule: () => void;
}

export function useHoverTimer(
  onOpenChange: (open: boolean) => void,
): HoverTimer {
  const pending = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = React.useCallback(() => cancelPending(pending.current), []);
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  React.useEffect(() => cancel, [cancel]);

  const schedule = (): void => {
    cancel();
    pending.current = setTimeout(close, closeGraceMs);
  };

  return { close, cancel, schedule };
}

function cancelPending(pending: ReturnType<typeof setTimeout> | null): void {
  if (pending) clearTimeout(pending);
}
