import { useEffect, useState } from 'react';
import { useSessionFill } from '#lib/product/session-fill';

export interface PlanView {
  // The plan shows under its header, scrolling in the card.
  open: boolean;
  // The card fills the Session column above the Composer.
  full: boolean;
  toggleOpen: () => void;
  toggleFull: () => void;
}

// How much of the plan the card shows; leaving the card ends full page.
export function usePlanView(): PlanView {
  const [open, setOpen] = useState(false);
  const { filled: full, setFilled } = useSessionFill();

  useEffect((): (() => void) => () => setFilled(false), [setFilled]);

  return {
    open: open || full,
    full,
    toggleOpen: () => {
      setFilled(false);
      setOpen(!(open || full));
    },
    toggleFull: () => setFilled(!full),
  };
}
