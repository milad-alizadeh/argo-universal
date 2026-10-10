import { randomUUID } from 'node:crypto';
import type { Database } from '@repo/db';
import { findMachineActor } from '../lib/machine-actor';
import type { AgentsRouterDeps } from '../services/agents';
import type { BlobUploadDeps } from '../services/blob';
import type { FeedDeps } from '../services/feed';
import {
  createSessionReader,
  createSessionSnapshotWatcher,
  type RegistryActorRef,
  type SessionActorRef,
  type SessionRouterDeps,
  sessionActorId,
  sessionMachine,
} from '../services/sessions';
import type { SystemDeps } from '../services/system';
import { databaseWriterId, writerMachine } from '../storage';

// Each router reads its own slice; only the Feed's sources are built here.
export type AppRouterDeps = SessionRouterDeps &
  AgentsRouterDeps &
  BlobUploadDeps &
  SystemDeps & { feed: FeedDeps };

export type AppRouterInput = Omit<
  AppRouterDeps,
  'feed' | 'readSession' | 'createId'
> &
  Partial<Pick<AppRouterDeps, 'createId'>>;

function createFeedDeps(
  { database, sessions }: { database: Database; sessions: RegistryActorRef },
  readSession: FeedDeps['readSession'],
): FeedDeps {
  const findSession = (sessionId: string): SessionActorRef | undefined =>
    findMachineActor(
      sessions.system,
      sessionActorId(sessionId),
      sessionMachine,
    );
  const findFeed: FeedDeps['findFeed'] = (sessionId) =>
    findSession(sessionId)?.getSnapshot().children.feed;
  const findWriter: FeedDeps['findWriter'] = () =>
    findMachineActor(sessions.system, databaseWriterId, writerMachine);
  const sources = { database, sessions, findSession, findFeed, findWriter };
  return {
    ...sources,
    readSession,
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}

export function createAppRouterDeps(input: AppRouterInput): AppRouterDeps {
  const readSession = createSessionReader(input.database);
  return {
    ...input,
    createId: input.createId ?? randomUUID,
    readSession,
    feed: createFeedDeps(input, readSession),
  };
}
