import { randomUUID } from 'node:crypto';
import type { Database } from '@repo/db';
import { createRejectionCounter } from '@repo/machine-log';
import type { ActorRefFrom } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import type { uploadBlob } from '../services/blob';
import { type FeedDeps } from '../services/feed';
import { databaseWriterId, writerMachine } from '../services/feed';
import {
  createSessionList,
  createSessionReader,
  createSessionSnapshotWatcher,
  type SessionActorRef,
} from '../services/sessions';
import { sessionActorId, sessionMachine } from '../services/sessions';
import type { SystemDeps } from '../services/system';
import type { HttpServerOptions } from './http-server';

export type Context = Pick<HttpServerOptions, 'sessions' | 'createId'> &
  Parameters<typeof uploadBlob>[0] & {
    database: Database;
  } & SystemDeps &
  FeedDeps & {
    sessionCommandSignal?: AbortSignal;
    projectRejections: ReturnType<typeof createRejectionCounter>;
    sessionList: ReturnType<typeof createSessionList>;
    databaseWriter: ActorRefFrom<typeof writerMachine>;
    syncSupervisor: HttpServerOptions['syncSupervisor'];
  };

export function createEngineContext(
  engineOptions: Pick<HttpServerOptions, 'sessions'> &
    Partial<Pick<HttpServerOptions, 'createId'>> &
    Parameters<typeof uploadBlob>[0] & {
      database: Database;
    } & SystemDeps &
    Pick<Context, 'sessionCommandSignal'> &
    Pick<HttpServerOptions, 'databaseWriter' | 'syncSupervisor'>,
): Context {
  const findSession = (sessionId: string): SessionActorRef | undefined =>
    findMachineActor(
      engineOptions.sessions.system,
      sessionActorId(sessionId),
      sessionMachine,
    );
  const findFeed: FeedDeps['findFeed'] = (sessionId) =>
    findSession(sessionId)?.getSnapshot().children.feed;
  const findWriter: FeedDeps['findWriter'] = () =>
    findMachineActor(
      engineOptions.sessions.system,
      databaseWriterId,
      writerMachine,
    );
  return {
    database: engineOptions.database,
    blobsFolder: engineOptions.blobsFolder,
    version: engineOptions.version,
    startedAt: engineOptions.startedAt,
    sessions: engineOptions.sessions,
    sessionCommandSignal: engineOptions.sessionCommandSignal,
    createId: engineOptions.createId ?? randomUUID,
    projectRejections: createRejectionCounter('projects'),
    readSession: createSessionReader(engineOptions.database),
    findFeed,
    findWriter,
    watchSessionSnapshot: createSessionSnapshotWatcher({
      ...engineOptions,
      findSession,
      findFeed,
      findWriter,
    }),
    sessionList: createSessionList(engineOptions),
    databaseWriter: engineOptions.databaseWriter,
    syncSupervisor: engineOptions.syncSupervisor,
  };
}
