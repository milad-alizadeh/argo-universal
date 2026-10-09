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
  options: Parameters<typeof createServerServices>[0] & SystemDeps,
): Context {
  return {
    database: options.database,
    version: options.version,
    startedAt: options.startedAt,
    sessions: options.sessions,
    createId: options.createId ?? randomUUID,
    services: createServerServices(options),
    readSession: createSessionReader(options.database),
    sessionList: createSessionList(options),
  };
}
