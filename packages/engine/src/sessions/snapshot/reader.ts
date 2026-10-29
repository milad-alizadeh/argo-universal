import type {
  ChangesSummary,
  SessionSnapshot,
  SessionUpdate,
  Turn,
} from '@repo/contracts';
import type { FeedDeps } from '../../feed';
import { createLiveHeaderReader } from '../live-header';
import type { SessionActorRef } from '../session-machine';
import { createQueuedSessionReader } from '../session-record';
import { readLatestTurn } from '../session-storage';
import { storedShells } from '../shells/reader';
import { createSubagentsReader } from '../subagents';
import {
  toSessionSnapshot,
  type FeedSnapshot,
  type StoredSnapshot,
} from './snapshot';

type SnapshotStored = ReturnType<ReturnType<typeof createQueuedSessionReader>>;

type SnapshotDeps = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>;

type SessionState = ReturnType<SessionActorRef['getSnapshot']> | null;

type FeedState = Pick<SessionSnapshot, 'epoch' | 'maxRevision'> & {
  rows?: Record<string, SessionUpdate>;
  changes?: ChangesSummary;
};

interface SnapshotRead {
  snapshot: SessionSnapshot;
  isClosed: boolean;
}

export class SessionSnapshotReader {
  private readonly readSession: ReturnType<typeof createQueuedSessionReader>;
  private readonly readSubagents: ReturnType<typeof createSubagentsReader>;
  private readonly readHeader: ReturnType<typeof createLiveHeaderReader>;

  public constructor(private readonly deps: SnapshotDeps) {
    this.readSubagents = createSubagentsReader(deps);
    this.readSession = createQueuedSessionReader(deps);
    this.readHeader = createLiveHeaderReader(deps);
  }

  public read(
    sessionId: string,
    actor: SessionActorRef | undefined,
  ): SnapshotRead {
    const session = currentSession(actor);
    const stored = this.readSession(sessionId);

    return {
      snapshot: this.snapshot(sessionId, session, stored),
      isClosed: closedSession(actor, stored.parentSessionId),
    };
  }

  private snapshot(
    id: string,
    session: SessionState,
    stored: SnapshotStored,
  ): SessionSnapshot {
    const feed = this.feedContext(id, stored);
    const snapshot = this.feedSnapshot(id, session, feed);

    return toSessionSnapshot(
      session,
      snapshot,
      this.storedSnapshot(id, stored),
    );
  }

  private storedSnapshot(
    sessionId: string,
    stored: SnapshotStored,
  ): StoredSnapshot {
    return {
      ...stored,
      subagents: this.readSubagents(sessionId),
      shells: storedShells(this.deps.database, sessionId),
    };
  }

  private feedSnapshot(
    sessionId: string,
    session: SessionState,
    feed: FeedState,
  ): FeedSnapshot {
    return { ...feed, ...this.liveHeader(sessionId, session, feed) };
  }

  private feedContext(sessionId: string, stored: FeedState): FeedState {
    const actor = this.deps.findFeed(sessionId);

    return actor ? actor.getSnapshot().context : stored;
  }

  private liveHeader(
    sessionId: string,
    session: SessionState,
    feed: FeedState,
  ): Pick<FeedSnapshot, 'liveHeader' | 'activeTurnId'> {
    const { header, activeTurnId } = this.readHeader({
      sessionId,
      live: session ? session.context : null,
      latestTurn: (): Turn | undefined => this.latestTurn(sessionId),
      memoryRows: feed.rows ?? {},
      writer: this.deps.findWriter(),
    });

    return { liveHeader: header, activeTurnId };
  }

  private latestTurn(sessionId: string): Turn | undefined {
    const { database, findWriter } = this.deps;

    return readLatestTurn({ database, writer: findWriter() }, sessionId);
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
