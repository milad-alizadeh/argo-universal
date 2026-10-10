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

export type AppRouterDeps = SessionRouterDeps &
  AgentsRouterDeps &
  BlobUploadDeps &
  SystemDeps &
  FeedDeps;

type FeedSourcesInput = { database: Database; sessions: RegistryActorRef };

type FeedSources = FeedSourcesInput &
  Pick<FeedDeps, 'findFeed' | 'findWriter'> & {
    findSession: (sessionId: string) => SessionActorRef | undefined;
  };

const findLiveSession =
  (sessions: RegistryActorRef) =>
  (sessionId: string): SessionActorRef | undefined =>
    findMachineActor(
      sessions.system,
      sessionActorId(sessionId),
      sessionMachine,
    );

// Where the Feed finds the live Session, its feed actor and the Writer.
export function createFeedSources(input: FeedSourcesInput): FeedSources {
  const findSession = findLiveSession(input.sessions);
  return {
    ...input,
    findSession,
    findFeed: (sessionId) =>
      findSession(sessionId)?.getSnapshot().children.feed,
    findWriter: () =>
      findMachineActor(input.sessions.system, databaseWriterId, writerMachine),
  };
}

export type AppRouterInput = Omit<AppRouterDeps, keyof FeedDeps | 'createId'> &
  FeedSourcesInput &
  Partial<Pick<AppRouterDeps, 'createId'>>;

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  return {
    ...input,
    ...sources,
    createId: input.createId ?? randomUUID,
    readSession: createSessionReader(input.database),
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}
