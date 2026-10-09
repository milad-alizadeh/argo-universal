import { randomUUID } from 'node:crypto';
import { type FeedDeps, findDatabaseWriter } from '../services/feed';
import { createServerServices } from '../services/server-services';
import type { Services } from '../services/services';
import {
  createSessionList,
  createSessionReader,
  createSessionSnapshotWatcher,
  findSessionActor,
  type SessionActorRef,
} from '../services/sessions';
import type { SystemDeps } from '../services/system';
import type { HttpServerOptions } from './http-server';

export type Context = Pick<
  HttpServerOptions,
  'database' | 'sessions' | 'createId'
> &
  SystemDeps &
  FeedDeps & {
    services: Services;
    sessionList: ReturnType<typeof createSessionList>;
  };

export function createEngineContext(
  engineOptions: Parameters<typeof createServerServices>[0] & SystemDeps,
): Context {
  const findSession = (sessionId: string): SessionActorRef | undefined =>
    findSessionActor(engineOptions.sessions.system, sessionId);
  const findFeed: FeedDeps['findFeed'] = (sessionId) =>
    findSession(sessionId)?.getSnapshot().children.feed;
  const findWriter: FeedDeps['findWriter'] = () =>
    findDatabaseWriter(engineOptions.sessions.system);
  return {
    database: engineOptions.database,
    version: engineOptions.version,
    startedAt: engineOptions.startedAt,
    sessions: engineOptions.sessions,
    createId: engineOptions.createId ?? randomUUID,
    services: createServerServices(engineOptions),
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
  };
}
