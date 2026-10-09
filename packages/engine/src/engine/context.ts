import { randomUUID } from 'node:crypto';
import { createRejectionCounter } from '../lib/count-rejections';
import {
  createRegistryReader,
  resolveRegistryServerPlatform,
  type CatalogReadInput,
} from '../services/agents';
import type { uploadBlob } from '../services/blob';
import { type FeedDeps, findDatabaseWriter } from '../services/feed';
import {
  createSessionList,
  createSessionReader,
  createSessionSnapshotWatcher,
  findSessionActor,
  type SessionActorRef,
} from '../services/sessions';
import type { SystemDeps } from '../services/system';
import type { HttpServerOptions } from './http-server';

export type Context = Pick<HttpServerOptions, 'sessions' | 'createId'> &
  Parameters<typeof uploadBlob>[0] & {
    database: import('@repo/db').Database;
  } & SystemDeps &
  FeedDeps & {
    sessionCommandSignal?: AbortSignal;
    projectRejections: ReturnType<typeof createRejectionCounter>;
    sessionList: ReturnType<typeof createSessionList>;
    catalogRead: Pick<CatalogReadInput, 'reader' | 'platform'>;
    databaseWriter: NonNullable<ReturnType<typeof findDatabaseWriter>>;
    syncSupervisor: HttpServerOptions['syncSupervisor'];
  };

export function createEngineContext(
  engineOptions: Pick<HttpServerOptions, 'sessions'> &
    Partial<Pick<HttpServerOptions, 'createId'>> &
    Parameters<typeof uploadBlob>[0] & {
      database: import('@repo/db').Database;
    } & SystemDeps &
    Pick<Context, 'sessionCommandSignal'> &
    Pick<HttpServerOptions, 'databaseWriter' | 'platform' | 'syncSupervisor'>,
): Context {
  const findSession = (sessionId: string): SessionActorRef | undefined =>
    findSessionActor(engineOptions.sessions.system, sessionId);
  const findFeed: FeedDeps['findFeed'] = (sessionId) =>
    findSession(sessionId)?.getSnapshot().children.feed;
  const findWriter: FeedDeps['findWriter'] = () =>
    findDatabaseWriter(engineOptions.sessions.system);
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
    catalogRead: {
      reader: createRegistryReader(),
      platform: engineOptions.platform ?? resolveRegistryServerPlatform(),
    },
  };
}
