import { randomUUID } from 'node:crypto';
import type { uploadBlob } from '../services/blob';
import { createServerServices } from '../services/server-services';
import type { Services } from '../services/services';
import { createSessionList, createSessionReader } from '../services/sessions';
import type { HttpServerOptions } from './http-server';

export type Context = Pick<HttpServerOptions, 'sessions' | 'createId'> &
  Parameters<typeof uploadBlob>[0] & {
    services: Services;
    readSession: ReturnType<typeof createSessionReader>;
    sessionList: ReturnType<typeof createSessionList>;
  };

export function createEngineContext(
  engineOptions: Parameters<typeof createServerServices>[0] &
    Parameters<typeof uploadBlob>[0],
): Context {
  return {
    database: engineOptions.database,
    blobsFolder: engineOptions.blobsFolder,
    sessions: engineOptions.sessions,
    createId: engineOptions.createId ?? randomUUID,
    services: createServerServices(engineOptions),
    readSession: createSessionReader(engineOptions.database),
    sessionList: createSessionList(engineOptions),
  };
}
