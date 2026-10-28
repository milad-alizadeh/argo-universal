import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { type FrameWait, stopWaiting, waitForFrame } from './frame-wait';

interface Held<T> {
  session: string | undefined;
  value: T;
}

export interface FrameCommit<T> {
  // Holds `value` for the frame; the newest value held when the frame comes is the one committed.
  schedule: (value: T) => void;
  // Drops whatever is held, such as when the reader leaves the Session.
  cancel: () => void;
}

/*
 * A streaming Turn sends several row events a frame, and each one rebuilt the view and redrew the
 * list. The rows themselves are still applied as each event lands, so the next event reads the
 * newest text; only the commit waits for the frame, which is as often as a reader can see it change.
 * A hidden window draws no frames, and its Session page still has to take the first prompt and show
 * its Composer, so the commit goes without one after a moment (frame-wait.ts).
 * A commit held for a Session the reader has left is dropped rather than drawn over the new one.
 */
export function useFrameCommit<T>(
  commit: (value: T) => void,
  session: RefObject<string | undefined>,
): FrameCommit<T> {
  const held = useRef<Held<T> | null>(null);
  const frame = useRef<FrameWait | null>(null);

  const cancel = useCallback(() => {
    if (frame.current !== null) stopWaiting(frame.current);
    frame.current = null;
    held.current = null;
  }, []);

  const schedule = useCallback(
    (value: T) => {
      held.current = { session: session.current, value };

      if (frame.current !== null) return;

      frame.current = waitForFrame(() => {
        frame.current = null;
        const next = held.current;
        held.current = null;

        if (next && next.session === session.current) commit(next.value);
      });
    },
    [commit, session],
  );

  useEffect(() => cancel, [cancel]);

  // One object for the life of the hook: a new one would rebuild every caller that holds it.
  return useMemo(() => ({ schedule, cancel }), [schedule, cancel]);
}
