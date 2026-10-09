import { randomUUID } from 'node:crypto';
import { createRejectionCounter } from '../lib/count-rejections';
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
    sessionCommandSignal?: AbortSignal;
    services: Services;
    projectRejections: ReturnType<typeof createRejectionCounter>;
    readSession: ReturnType<typeof createSessionReader>;
    sessionList: ReturnType<typeof createSessionList>;
  };

export function createEngineContext(
  engineOptions: Parameters<typeof createServerServices>[0] &
    SystemDeps &
    Pick<Context, 'sessionCommandSignal'>,
): Context {
  return {
    database: engineOptions.database,
    version: engineOptions.version,
    startedAt: engineOptions.startedAt,
    sessions: engineOptions.sessions,
    sessionCommandSignal: engineOptions.sessionCommandSignal,
    createId: engineOptions.createId ?? randomUUID,
    services: createServerServices(engineOptions),
    projectRejections: createRejectionCounter('projects'),
    readSession: createSessionReader(engineOptions.database),
    sessionList: createSessionList(engineOptions),
  };
}
