import type { LiveHeader, SessionUpdate, Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { WriterActorRef } from '../../storage';
import { toLiveHeader, type LiveHeaderInput } from './header';
import { createLiveHeaderRowsReader } from './rows';

type ActiveTurn = Pick<LiveHeaderInput, 'activeTurnId' | 'activeTurnStartedAt'>;

// The part of a Session actor's context the Live header reads.
export type LiveSession = ActiveTurn &
  Pick<LiveHeaderInput, 'permissionQueue' | 'elicitationQueue'>;

export type LiveHeaderRead = {
  sessionId: string;
  // The Session actor's context, or null when no Session actor is open.
  live: LiveSession | null;
  // The Session's latest Turn, stored or queued; called only when no Session actor is open.
  latestTurn: () => Turn | undefined;
  // The rows the Session's Feed actor holds.
  memoryRows: Record<string, SessionUpdate>;
  writer: WriterActorRef | undefined;
};

type LiveHeaderResult = {
  header: LiveHeader | null;
  // A stored row the Live header needed failed its shape.
  rejected: boolean;
};

const noTurn: ActiveTurn = { activeTurnId: null, activeTurnStartedAt: null };

// One Live header for the Session list and the Session snapshot: the Session actor's active Turn, else the latest Turn while it runs.
export function createLiveHeaderReader(deps: {
  database: Database;
}): (input: LiveHeaderRead) => LiveHeaderResult {
  const readRows = createLiveHeaderRowsReader(deps);

  return (input): LiveHeaderResult => {
    const session = headerSession(input);

    const { rows, rejected } = readRows({
      writer: input.writer,
      sessionId: input.sessionId,
      turnId: session.activeTurnId,
      rows: input.memoryRows,
    });

    return { header: toLiveHeader(session, Object.values(rows)), rejected };
  };
}

function headerSession({ live, latestTurn }: LiveHeaderRead): LiveHeaderInput {
  if (live) return { ...requests(live), ...activeTurnOf(live) };

  return {
    permissionQueue: [],
    elicitationQueue: [],
    ...runningTurn(latestTurn()),
  };
}

function requests(
  live: LiveSession,
): Pick<LiveHeaderInput, 'permissionQueue' | 'elicitationQueue'> {
  return {
    permissionQueue: live.permissionQueue,
    elicitationQueue: live.elicitationQueue,
  };
}

function activeTurnOf(live: LiveSession): ActiveTurn {
  return {
    activeTurnId: live.activeTurnId,
    activeTurnStartedAt: live.activeTurnStartedAt,
  };
}

function runningTurn(latest: Turn | undefined): ActiveTurn {
  return latest?.status === 'running'
    ? { activeTurnId: latest.id, activeTurnStartedAt: latest.startedAt }
    : noTurn;
}
