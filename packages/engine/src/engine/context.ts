import { randomUUID } from 'node:crypto';
import { createServerServices } from '../services/server-services';
import type { Services } from '../services/services';
import { createSessionList, createSessionReader } from '../services/sessions';
import type { HttpServerOptions } from './http-server';

export type Context = Pick<
  HttpServerOptions,
  'database' | 'sessions' | 'createId'
> & {
  services: Services;
  readSession: ReturnType<typeof createSessionReader>;
  sessionList: ReturnType<typeof createSessionList>;
};

export function createEngineContext(
  options: Parameters<typeof createServerServices>[0],
): Context {
  return {
    database: options.database,
    sessions: options.sessions,
    createId: options.createId ?? randomUUID,
    services: createServerServices(options),
    readSession: createSessionReader(options.database),
    sessionList: createSessionList(options),
  };
}
