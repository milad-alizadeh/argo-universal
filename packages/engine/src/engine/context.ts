import { randomUUID } from 'node:crypto';
import { createServerServices } from '../services/server-services';
import type { Services } from '../services/services';
import { createSessionList, createSessionReader } from '../services/sessions';
import type { SystemDeps } from '../services/system';
import type { HttpServerOptions } from './http-server';

export type Context = Pick<
  HttpServerOptions,
  'database' | 'sessions' | 'createId'
> &
  SystemDeps & {
    services: Services;
    readSession: ReturnType<typeof createSessionReader>;
    sessionList: ReturnType<typeof createSessionList>;
  };

export function createEngineContext(
  engineOptions: Parameters<typeof createServerServices>[0] & SystemDeps,
): Context {
  return {
    database: engineOptions.database,
    version: engineOptions.version,
    startedAt: engineOptions.startedAt,
    sessions: engineOptions.sessions,
    createId: engineOptions.createId ?? randomUUID,
    services: createServerServices(engineOptions),
    readSession: createSessionReader(engineOptions.database),
    sessionList: createSessionList(engineOptions),
  };
}
