import { type RefObject, useEffect, useMemo } from 'react';
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

interface FrameQueue<T> {
  held: Held<T> | null;
  frame: FrameWait | null;
}

// A streaming Turn commits at most once per frame; a held commit for a Session left is dropped.
export function useFrameCommit<T>(
  commit: (value: T) => void,
  session: RefObject<string | undefined>,
): FrameCommit<T> {
  const queue = useMemo(
    () => createFrameCommit(commit, session),
    [commit, session],
  );

  useEffect(() => queue.cancel, [queue]);

  return queue;
}

function createFrameCommit<T>(
  commit: (value: T) => void,
  session: RefObject<string | undefined>,
): FrameCommit<T> {
  const queue: FrameQueue<T> = { held: null, frame: null };

  return {
    schedule: (value) => scheduleFrame(queue, { value, session, commit }),
    cancel: () => cancelFrame(queue),
  };
}

function cancelFrame<T>(queue: FrameQueue<T>): void {
  if (queue.frame !== null) stopWaiting(queue.frame);
  queue.frame = null;
  queue.held = null;
}

function scheduleFrame<T>(
  queue: FrameQueue<T>,
  input: {
    value: T;
    session: RefObject<string | undefined>;
    commit: (value: T) => void;
  },
): void {
  queue.held = { session: input.session.current, value: input.value };

  if (queue.frame !== null) return;

  queue.frame = waitForFrame(() => commitFrame(queue, input));
}

function commitFrame<T>(
  queue: FrameQueue<T>,
  input: { session: RefObject<string | undefined>; commit: (value: T) => void },
): void {
  queue.frame = null;
  const next = queue.held;
  queue.held = null;

  if (next && next.session === input.session.current) input.commit(next.value);
}
