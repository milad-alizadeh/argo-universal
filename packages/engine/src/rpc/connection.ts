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

  const surface = params?.['pluginSurface']
    ? PluginSurface.parse(JSON.parse(params['pluginSurface']))
    : undefined;

  return {
    connection: { id: randomUUID(), signal: controller.signal, surface },
  };
}
