import { randomUUID } from 'node:crypto';
import { serverDeviceIdentity } from '../src/rpc';
import type { RpcContext } from '../src/rpc/connection';

/*
 * The context a router test calls through: this computer's own App, which the front door admits as the Server Device (ADR-0045).
 * A context with no identity is what an unauthenticated Connection would have, and every procedure refuses it, so a test that means to reach one says which Device it is.
 */
export const serverDeviceContext = (signal?: AbortSignal): RpcContext => ({
  connection: {
    id: randomUUID(),
    signal: signal ?? new AbortController().signal,
    identity: serverDeviceIdentity,
  },
});
