import { useEffect, useRef, useState } from 'react';
import {
  SessionMemory,
  useSessionMemory,
} from '../../../lib/product/session-memory';

const expansionMemory = new SessionMemory(false);

type ExpansionView = { open: boolean; sessionId: string | undefined };

const wasClosed = (previous: ExpansionView, next: ExpansionView): boolean =>
  previous.sessionId === next.sessionId && previous.open && !next.open;

function useResetsExpansion(
  view: ExpansionView,
  reset: (value: boolean) => void,
): void {
  const previous = useRef(view);
  const { open, sessionId } = view;

  useEffect(() => {
    const next = { open, sessionId };

    if (wasClosed(previous.current, next)) reset(false);
    previous.current = next;
  }, [open, sessionId, reset]);
}

// Each Session remembers whether its open Inspector fills the page.
export function useExpanded(
  open: boolean,
  sessionId: string | undefined,
): [boolean, (expanded: boolean) => void] {
  const remembered = useSessionMemory(expansionMemory, sessionId ?? '');
  const local = useState(false);
  const [expanded, setExpanded] = sessionId === undefined ? local : remembered;

  useResetsExpansion({ open, sessionId }, setExpanded);

  return [expanded, setExpanded];
}
