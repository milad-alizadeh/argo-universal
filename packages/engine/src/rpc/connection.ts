import { randomUUID } from 'node:crypto';
import type { Socket } from 'node:net';

export interface RpcConnection {
  id: string;
  signal: AbortSignal;
}

export interface RpcContext {
  connection?: RpcConnection;
}

export function createRpcContext(socket: Socket): RpcContext {
  const controller = new AbortController();
  socket.once('close', () => controller.abort());

  return { connection: { id: randomUUID(), signal: controller.signal } };
}
