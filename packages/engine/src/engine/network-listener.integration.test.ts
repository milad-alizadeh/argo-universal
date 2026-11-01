import { createServer, type Server } from 'node:http';
import { findFreePort } from '@repo/mocks/network/free-port';
import { afterEach, expect, it, vi } from 'vitest';
import { refuseBinds } from '#mocks/engine-network';
import { listenForNetworkAccess } from './network-listener';

const servers: Server[] = [];

afterEach(() => {
  vi.restoreAllMocks();

  for (const server of servers.splice(0)) server.close();
});

async function start(): Promise<{ server: Server; port: number }> {
  const server = createServer();
  const port = await findFreePort();
  servers.push(server);

  return { server, port };
}

it('rejects with the error of the bind and keeps listening where it was', async (): Promise<void> => {
  const { server, port } = await start();
  const listener = await listenForNetworkAccess(server, port, false);
  refuseBinds(server);

  await expect(listener.rebind(true)).rejects.toThrow('0.0.0.0 is in use');

  expect(server.listening).toBe(true);
  expect(listener.where()).toBe(`127.0.0.1:${port}`);
});

it('reports both errors when it can neither move nor go back', async (): Promise<void> => {
  const { server, port } = await start();
  const listener = await listenForNetworkAccess(server, port, false);
  refuseBinds(server, 2);

  const failure = await listener.rebind(true).then(
    (): Error => new Error('the move did not fail'),
    (error: Error): Error => error,
  );

  expect(failure).toBeInstanceOf(AggregateError);
  expect(failure).toHaveProperty('errors.0.message', '0.0.0.0 is in use');
  expect(failure).toHaveProperty('errors.1.message', '127.0.0.1 is in use');
  expect(server.listening).toBe(false);
  vi.restoreAllMocks();
  await listener.rebind(false);

  expect(server.listening).toBe(true);
});

it('does not bind again once stopped', async (): Promise<void> => {
  const { server, port } = await start();
  const listener = await listenForNetworkAccess(server, port, false);

  listener.stop();
  server.close();

  await expect(listener.rebind(true)).rejects.toThrow('The Server is closing');
  expect(server.listening).toBe(false);
});
