import { randomUUID } from 'node:crypto';
import { createRejectionCounter } from '../lib/count-rejections';
import { createServerServices } from '../services/server-services';
import type { Services } from '../services/services';
import { createSessionList, createSessionReader } from '../services/sessions';
import type { HttpServerOptions } from './http-server';

export type Context = Pick<
  HttpServerOptions,
  'database' | 'sessions' | 'createId'
> & {
  services: Services;
  projectRejections: ReturnType<typeof createRejectionCounter>;
  readSession: ReturnType<typeof createSessionReader>;
  sessionList: ReturnType<typeof createSessionList>;
};

export function createEngineContext(
  engineOptions: Parameters<typeof createServerServices>[0],
): Context {
  return {
    database: engineOptions.database,
    sessions: engineOptions.sessions,
    createId: engineOptions.createId ?? randomUUID,
    services: createServerServices(engineOptions),
    projectRejections: createRejectionCounter('projects'),
    readSession: createSessionReader(engineOptions.database),
    sessionList: createSessionList(engineOptions),
  };
}
