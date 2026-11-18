import { useState } from 'react';
import {
  SessionMemory,
  useSessionMemory,
} from '../../../lib/product/session-memory';

const expansionMemory = new SessionMemory(false);

// Each Session remembers whether its Inspector fills the page through a close.
export function useExpanded(
  sessionId: string | undefined,
): [boolean, (expanded: boolean) => void] {
  const remembered = useSessionMemory(expansionMemory, sessionId ?? '');
  const local = useState(false);

  return sessionId === undefined ? local : remembered;
}
