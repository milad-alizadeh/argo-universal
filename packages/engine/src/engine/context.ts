import { randomUUID } from 'node:crypto';
import { createRejectionCounter } from '../lib/count-rejections';
import type { uploadBlob } from '../services/blob';
import { createServerServices } from '../services/server-services';
import type { Services } from '../services/services';
import { createSessionList, createSessionReader } from '../services/sessions';
import type { SystemDeps } from '../services/system';
import type { HttpServerOptions } from './http-server';

export type Context = Pick<HttpServerOptions, 'sessions' | 'createId'> &
  Parameters<typeof uploadBlob>[0] &
  SystemDeps & {
    services: Services;
    projectRejections: ReturnType<typeof createRejectionCounter>;
    readSession: ReturnType<typeof createSessionReader>;
    sessionList: ReturnType<typeof createSessionList>;
  };

export function createEngineContext(
  engineOptions: Parameters<typeof createServerServices>[0] &
    Parameters<typeof uploadBlob>[0] &
    SystemDeps,
): Context {
  return {
    database: engineOptions.database,
    blobsFolder: engineOptions.blobsFolder,
    version: engineOptions.version,
    startedAt: engineOptions.startedAt,
    sessions: engineOptions.sessions,
    createId: engineOptions.createId ?? randomUUID,
    services: createServerServices(engineOptions),
    projectRejections: createRejectionCounter('projects'),
    readSession: createSessionReader(engineOptions.database),
    sessionList: createSessionList(engineOptions),
  };
}
