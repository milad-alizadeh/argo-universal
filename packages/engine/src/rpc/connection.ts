import { randomUUID } from 'node:crypto';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { PluginSurface } from '@repo/contracts/plugins/kit';
import { createRejectionCounter } from '@repo/machine-log';
import { identityOf, type RpcIdentity, type RpcSocket } from './identity';

const rejections = createRejectionCounter('Plugin surface header');

export type { RpcSocket } from './identity';

export interface RpcConnection {
  id: string;
  signal: AbortSignal;
  surface?: PluginSurface;
  // Who this Connection proved to be; absent when nothing admitted it, which every procedure refuses.
  identity?: RpcIdentity;
}

export interface RpcContext {
  token?: string;
  connection?: RpcConnection;
}

/*
 * The Connection a call arrived on. `identity` is whatever admitted the socket, unless the caller names one: a plain-HTTP request proves the Server Device per request, not per socket (#1696).
 */
export function createRpcContext(
  socket: RpcSocket,
  params?: Record<string, string | undefined> | null,
  identity: RpcIdentity | undefined = identityOf(socket),
): RpcContext {
  const controller = new AbortController();
  socket.once('close', () => controller.abort());

  return {
    connection: socketConnection(params, controller.signal, identity),
  };
}

function socketConnection(
  params: Record<string, string | undefined> | null | undefined,
  signal: AbortSignal,
  identity: RpcIdentity | undefined,
): RpcConnection {
  return {
    id: randomUUID(),
    signal,
    surface: reportedSurface(params?.['pluginSurface']),
    identity,
  };
}

// A missing surface reports no wire version, and that App sees "Update Argo", not a broken Connection. A surface that is present but not JSON or not recognised does too, and is reported.
const reportedSurface = (
  reported: string | undefined,
): PluginSurface | undefined => (reported ? readSurface(reported) : undefined);

function readSurface(text: string): PluginSurface | undefined {
  const json = parseJson(text);

  return json === undefined ? undefined : recognisedSurface(json);
}

function parseJson(text: string): Json | undefined {
  try {
    return JSON.parse(text);
  } catch (cause) {
    rejections.report('non-JSON surface', cause);

    return undefined;
  }
}

function recognisedSurface(json: Json): PluginSurface | undefined {
  const parsed = PluginSurface.safeParse(json);

  if (parsed.success) return parsed.data;
  rejections.report('unrecognised surface', parsed.error.issues);

  return undefined;
}
