import { useState } from 'react';
import type { ScaffoldProps } from './scaffold-props';

export interface WorkbenchPopover {
  workbenchPopover: boolean;
  setWorkbenchPopover: (open: boolean) => void;
}

const sessionOf = (scaffold: ScaffoldProps): string | undefined =>
  scaffold.band?.session?.sessionId;

// The Workbench opened over the content, as Codex's popover: held by the window, not the Session, and closed by a Session switch.
export function useWorkbenchPopover(scaffold: ScaffoldProps): WorkbenchPopover {
  const session = sessionOf(scaffold);
  const [held, setHeld] = useState({ open: false, session });

  return {
    workbenchPopover: held.open && held.session === session,
    setWorkbenchPopover: (open) => setHeld({ open, session }),
  };
}
