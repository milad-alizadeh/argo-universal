import { networkInterfaces } from 'node:os';
import { WebSocket } from 'ws';

// An address of this computer on the local network, the way another Device would reach it; undefined when it is offline.
export const lanAddress = Object.values(networkInterfaces())
  .flat()
  .find((entry) => entry?.family === 'IPv4' && !entry.internal)?.address;

// Opens a real WebSocket to the Server at `host`; rejects when nothing answers or the upgrade is refused.
export function connect(
  host: string | undefined,
  port: number,
): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject): void => {
    const socket = new WebSocket(`ws://${host}:${port}`);
    socket.once('open', (): void => resolve(socket));

    socket.once('unexpected-response', (_request, response): void => {
      response.resume();
      reject(new Error(`upgrade refused: ${response.statusCode}`));
    });

    socket.once('error', reject);
  });
}

export async function reachable(
  host: string | undefined,
  port: number,
): Promise<boolean> {
  const socket = await connect(host, port).catch((): null => null);
  socket?.close();

  return socket !== null;
}

export const closed = (socket: WebSocket): Promise<void> =>
  new Promise<void>((resolve): void => {
    socket.once('close', (): void => resolve());
  });
