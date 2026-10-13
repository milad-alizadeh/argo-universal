import { expect, it } from 'vitest';
import { WebSocket } from 'ws';
import {
  port,
  closeServer,
  systemInfoStatus,
  options,
} from '#mocks/engine-http';
import { startHttpServer } from './http-server';

it('rejects a second server on the same port', async (): Promise<void> => {
  await expect(startHttpServer(options())).rejects.toMatchObject({
    code: 'EADDRINUSE',
  });
  expect(await systemInfoStatus()).toBe(200);
});

it('closes while a WebSocket client is connected', async (): Promise<void> => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject): void => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  const closed = new Promise((resolve): WebSocket =>
    socket.once('close', resolve),
  );
  await closeServer();
  await closed;
  expect(socket.readyState).toBe(WebSocket.CLOSED);
});
