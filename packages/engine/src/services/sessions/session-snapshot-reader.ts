import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import type { FeedDeps } from '../feed';
import { createLiveHeaderRowsReader } from './live-header-rows';
import type { SessionActorRef } from './session-machine';
import { createSessionReader } from './session-record';
import { toSessionSnapshot } from './session-snapshot';

type SnapshotDeps = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>;
type SessionState = ReturnType<SessionActorRef['getSnapshot']> | null;
type FeedState = Pick<SessionSnapshot, 'epoch' | 'maxRevision'> & {
  rows?: Record<string, SessionUpdate>;
};

interface SnapshotRead {
  snapshot: SessionSnapshot;
  isClosed: boolean;
}

export class SessionSnapshotReader {
  private readonly readSession: ReturnType<typeof createSessionReader>;
  private readonly readRows: ReturnType<typeof createLiveHeaderRowsReader>;

  public constructor(private readonly deps: SnapshotDeps) {
    this.readSession = createSessionReader(deps.database);
    this.readRows = createLiveHeaderRowsReader(deps);
  }

  public read(
    sessionId: string,
    actor: SessionActorRef | undefined,
  ): SnapshotRead {
    const session = currentSession(actor);
    const stored = this.readSession(sessionId);
    const feed = this.feedContext(sessionId, stored);
    const rows = this.headerRows(sessionId, session, feed);
    const feedSnapshot = { context: { ...feed, rows } };
    return {
      snapshot: toSessionSnapshot(session, feedSnapshot, stored),
      isClosed: !actor && stored.parentSessionId === null,
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
