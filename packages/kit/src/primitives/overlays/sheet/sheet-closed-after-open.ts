import { useEffect, useRef } from 'react';
import type { SheetReports } from './sheet-state';

// A popover has no dismiss callback, so it reports closed as the sheet leaves its open state.
export function useClosedAfterOpen(props: {
  open: boolean;
  stack: { reports: SheetReports };
}): void {
  const wasOpen = useRef(false);
  const { open, stack } = props;

  useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) {
      wasOpen.current = false;
      stack.reports.closed();
    }
  }, [open, stack]);
}
