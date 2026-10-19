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

// An App that reports no wire version is older than the minimum, not a broken Connection.
function reportedSurface(
  reported: string | undefined,
): PluginSurface | undefined {
  return reported
    ? PluginSurface.safeParse(JSON.parse(reported)).data
    : undefined;
}
