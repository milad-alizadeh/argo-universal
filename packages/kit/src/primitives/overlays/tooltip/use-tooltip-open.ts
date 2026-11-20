import { useEffect, useRef, useState } from 'react';

const tooltipOpenDelayMs = 600;

type Pending = { current: ReturnType<typeof setTimeout> | null };

function cancel(pending: Pending): void {
  if (pending.current) clearTimeout(pending.current);
}

function schedule(
  pending: Pending,
  setOpen: (open: boolean) => void,
  next: boolean,
): void {
  cancel(pending);

  if (next)
    pending.current = setTimeout(() => setOpen(true), tooltipOpenDelayMs);
  else setOpen(false);
}

export function useTooltipOpen(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => (): void => cancel(pending), []);

  return [open, (next): void => schedule(pending, setOpen, next)];
}
