import { randomUUID } from 'node:crypto';
import type { Socket } from 'node:net';
import { PluginSurface } from '@repo/contracts/plugins/kit';

export interface RpcConnection {
  id: string;
  signal: AbortSignal;
  surface?: PluginSurface;
}

export interface RpcContext {
  connection?: RpcConnection;
}

export function createRpcContext(
  socket: Socket,
  params?: Record<string, string | undefined> | null,
): RpcContext {
  const controller = new AbortController();
  socket.once('close', () => controller.abort());

  return {
    connection: {
      id: randomUUID(),
      signal: controller.signal,
      surface: reportedSurface(params?.['pluginSurface']),
    },
  };
}

// A missing, non-JSON or malformed surface reports no wire version: that App sees "Update Argo", not a broken Connection.
function reportedSurface(
  reported: string | undefined,
): PluginSurface | undefined {
  if (!reported) return undefined;

  try {
    return PluginSurface.safeParse(JSON.parse(reported)).data;
  } catch {
    return undefined;
  }
}
