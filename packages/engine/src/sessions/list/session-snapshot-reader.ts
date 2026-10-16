import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import type { FeedDeps } from '../../feed';
import type { SessionActorRef } from '../session-machine';
import { createSessionReader } from '../session-record';
import { createLiveHeaderRowsReader } from './live-header-rows';
import { toSessionSnapshot } from './session-snapshot';
import { createSubagentsReader } from './subagents-reader';

type SnapshotDeps = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>;

type SessionState = ReturnType<SessionActorRef['getSnapshot']> | null;

type FeedSnapshot = {
  context: FeedState & { rows: Record<string, SessionUpdate> };
};

type FeedState = Pick<SessionSnapshot, 'epoch' | 'maxRevision'> & {
  rows?: Record<string, SessionUpdate>;
};

interface SnapshotRead {
  snapshot: SessionSnapshot;
  isClosed: boolean;
}

export class SessionSnapshotReader {
  private readonly readSession: ReturnType<typeof createSessionReader>;
  private readonly readSubagents: ReturnType<typeof createSubagentsReader>;
  private readonly readRows: ReturnType<typeof createLiveHeaderRowsReader>;

  public constructor(private readonly deps: SnapshotDeps) {
    this.readSubagents = createSubagentsReader(deps);
    this.readSession = createSessionReader(deps.database);
    this.readRows = createLiveHeaderRowsReader(deps);
  }

  public read(
    sessionId: string,
    actor: SessionActorRef | undefined,
  ): SnapshotRead {
    const session = currentSession(actor);
    const stored = this.readSession(sessionId);

    const feedSnapshot = this.feedSnapshot(
      sessionId,
      session,
      this.feedContext(sessionId, stored),
    );

    return {
      snapshot: toSessionSnapshot(session, feedSnapshot, {
        ...stored,
        subagents: this.readSubagents(sessionId),
      }),
      isClosed: closedSession(actor, stored.parentSessionId),
    };
  }

  private feedSnapshot(
    sessionId: string,
    session: SessionState,
    feed: FeedState,
  ): FeedSnapshot {
    return {
      context: { ...feed, rows: this.headerRows(sessionId, session, feed) },
    };
  }

  private feedContext(sessionId: string, stored: FeedState): FeedState {
    const actor = this.deps.findFeed(sessionId);

    return actor ? actor.getSnapshot().context : stored;
  }

  private headerRows(
    sessionId: string,
    session: SessionState,
    feed: FeedState,
  ): Record<string, SessionUpdate> {
    return this.readRows({
      writer: this.deps.findWriter(),
      sessionId,
      turnId: session ? session.context.activeTurnId : null,
      rows: feed.rows ?? {},
    }).rows;
  }
}

function currentSession(actor: SessionActorRef | undefined): SessionState {
  return actor ? actor.getSnapshot() : null;
}

function closedSession(
  actor: SessionActorRef | undefined,
  parentSessionId: string | null,
): boolean {
  return !actor && parentSessionId === null;
}
