import type { SessionSnapshot } from '@repo/contracts';
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { FeedState } from '../view/feed-state';
import { useHeldFeedStart, useKeepHeldFeed } from './held-feed';
import { resetSession } from './reset-feed-session';
import { useFrameCommit } from './use-frame-commit';

type FeedStart = ReturnType<typeof useHeldFeedStart>;

type FeedBuffer = {
  feedRef: RefObject<FeedState>;
  activeSession: RefObject<string | undefined>;
  closed: RefObject<boolean>;
  commit: ReturnType<typeof useFrameCommit<FeedState>>;
  replaceFeed: (feed: FeedState) => void;
};

type FeedValues = {
  feed: FeedState;
  setFeed: (feed: FeedState) => void;
  snapshot: SessionSnapshot | null;
  setSnapshot: (snapshot: SessionSnapshot | null) => void;
  closureError: Error | null;
  setClosureError: (error: Error | null) => void;
};

export type FeedStore = FeedBuffer & FeedValues & { start: FeedStart };

export function useFeedStore(sessionId: string | undefined): FeedStore {
  const start = useHeldFeedStart(sessionId);
  const values = useFeedValues(start);

  const buffer = useFeedBuffer(sessionId, {
    feed: values.feed,
    setFeed: values.setFeed,
    start,
  });

  useResetSession(sessionId, { start, ...values, commit: buffer.commit });
  useKeepHeldFeed(sessionId, { feed: values.feed, snapshot: values.snapshot });

  return { ...buffer, ...values, start };
}

function useFeedValues(start: FeedStart): FeedValues {
  const [feed, setFeed] = useState<FeedState>(start.feed);

  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(
    start.snapshot,
  );

  const [closureError, setClosureError] = useState<Error | null>(null);

  return {
    feed,
    setFeed,
    snapshot,
    setSnapshot,
    closureError,
    setClosureError,
  };
}

function useFeedBuffer(
  sessionId: string | undefined,
  input: {
    feed: FeedState;
    setFeed: (feed: FeedState) => void;
    start: ReturnType<typeof useHeldFeedStart>;
  },
): FeedBuffer {
  const refs = useBufferRefs(input.feed, sessionId);
  const commit = useFrameCommit(input.setFeed, refs.activeSession);
  useBufferLifecycle(sessionId, { ...refs, feed: input.start.feed });
  const replaceFeed = useBufferReplace(sessionId, { ...refs, commit });

  return { ...refs, commit, replaceFeed };
}

type BufferRefs = Pick<FeedBuffer, 'feedRef' | 'activeSession' | 'closed'>;

function useBufferRefs(
  feed: FeedState,
  sessionId: FeedBuffer['activeSession']['current'],
): BufferRefs {
  const feedRef = useRef(feed);
  const activeSession = useRef(sessionId);
  const closed = useRef(false);

  return { feedRef, activeSession, closed };
}

function useBufferLifecycle(
  sessionId: string | undefined,
  input: Pick<FeedBuffer, 'activeSession' | 'feedRef' | 'closed'> & {
    feed: FeedState;
  },
): void {
  const { activeSession, feedRef, closed, feed } = input;
  useEffect(
    () => resetBuffer({ activeSession, feedRef, closed, sessionId, feed }),
    [sessionId, feed, activeSession, feedRef, closed],
  );
}

function resetBuffer(
  input: Pick<FeedBuffer, 'activeSession' | 'feedRef' | 'closed'> & {
    sessionId: string | undefined;
    feed: FeedState;
  },
): void {
  input.activeSession.current = input.sessionId;
  input.feedRef.current = input.feed;
  input.closed.current = false;
}

function useBufferReplace(
  sessionId: string | undefined,
  {
    activeSession,
    feedRef,
    commit,
  }: Pick<FeedBuffer, 'activeSession' | 'feedRef' | 'commit'>,
): (feed: FeedState) => void {
  return useCallback(
    (feed: FeedState) =>
      replaceBufferedFeed({ sessionId, activeSession, feedRef, commit, feed }),
    [sessionId, activeSession, feedRef, commit],
  );
}

function replaceBufferedFeed(
  input: Pick<FeedBuffer, 'activeSession' | 'feedRef' | 'commit'> & {
    sessionId: string | undefined;
    feed: FeedState;
  },
): void {
  if (input.activeSession.current !== input.sessionId) return;
  input.feedRef.current = input.feed;
  input.commit.schedule(input.feed);
}

function useResetSession(
  sessionId: string | undefined,
  input: {
    start: ReturnType<typeof useHeldFeedStart>;
    setFeed: (feed: FeedState) => void;
    setSnapshot: (snapshot: SessionSnapshot | null) => void;
    setClosureError: (error: Error | null) => void;
    commit: ReturnType<typeof useFrameCommit<FeedState>>;
  },
): void {
  const [shownSession, setShownSession] = useState(sessionId);

  if (shownSession === sessionId) return;
  setShownSession(sessionId);
  resetSession(input);
}
