import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Duplex } from 'node:stream';
import { expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import { createActor, createMachine, fromPromise } from 'xstate';
import { createNodeMachineInspection } from './node';

it('closes a pending handshake and never reconnects after stop', async () => {
  vi.stubEnv('ARGO_MACHINE_INSPECT', '1');
  vi.stubEnv('ARGO_MACHINE_LOG', '0');
  vi.stubEnv('NODE_ENV', 'development');
  const server = createServer();
  const sockets = new Set<Duplex>();
  let connections = 0;
  server.on('upgrade', (_, socket) => {
    connections += 1;
    sockets.add(socket);
    socket.on('end', () => socket.destroy());
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address !== 'object')
    throw new Error('No Inspector address');
  const inspection = createNodeMachineInspection({
    home: '/unused',
    processName: 'supervisor',
    inspectorPort: address.port,
  });
  try {
    await vi.waitFor(() => expect(connections).toBe(1));
    inspection.stop();
    await vi.waitFor(() => expect(sockets.size).toBe(0));
    await new Promise((resolve) => setTimeout(resolve, 5200));
    expect(connections).toBe(1);
  } finally {
    inspection.stop();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 10000);

it.each([0, 100])(
  'sends definitions and cleaned snapshots when the relay starts %i milliseconds late',
  async (delay) => {
    vi.stubEnv('ARGO_MACHINE_LOG', '1');
    vi.stubEnv('ARGO_MACHINE_INSPECT', '1');
    vi.stubEnv('NODE_ENV', 'development');
    const home = mkdtempSync(join(tmpdir(), 'machine-inspector-'));
    let server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address !== 'object')
      throw new Error('No Inspector address');
    if (delay)
      await new Promise<void>((resolve) => server.close(() => resolve()));
    const frames: Record<string, unknown>[] = [];
    const observe = () =>
      server.on('connection', (socket) =>
        socket.on('message', (message) =>
          frames.push(JSON.parse(message.toString())),
        ),
      );
    if (!delay) observe();
    const inspection = createNodeMachineInspection({
      home,
      processName: 'engine',
      inspectorPort: address.port,
    });
    const context = { attempts: 2, queryClient: new Map(), callback: () => {} };
    const output: { value: number; cycle?: unknown; large: bigint } = {
      value: 3,
      large: 1n,
    };
    output.cycle = output;
    const actor = createActor(
      createMachine({
        id: 'engine',
        context,
        initial: 'serving',
        states: {
          serving: {
            invoke: { id: 'result', src: fromPromise(async () => output) },
          },
        },
      }),
      { inspect: inspection.inspect },
    ).start();
    try {
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        server = new WebSocketServer({ host: '127.0.0.1', port: address.port });
        observe();
      }
      await vi.waitFor(() =>
        expect(frames).toContainEqual(
          expect.objectContaining({
            type: '@xstate.actor',
            name: 'engine',
            definition: expect.stringContaining('serving'),
            sessionId: `engine:${process.pid}:${actor.sessionId}`,
          }),
        ),
      );
      const snapshot = await vi.waitFor(() => {
        const frame = frames.find(
          (frame) =>
            frame.type === '@xstate.snapshot' &&
            frame.sessionId === `engine:${process.pid}:${actor.sessionId}`,
        );
        expect(frame).toMatchObject({
          snapshot: { value: 'serving', context: { attempts: 2 } },
        });
        return frame;
      });
      expect(snapshot).toEqual(
        expect.objectContaining({
          snapshot: expect.objectContaining({ context: { attempts: 2 } }),
        }),
      );
      await vi.waitFor(() =>
        expect(frames).toContainEqual(
          expect.objectContaining({
            type: '@xstate.actor',
            name: 'result',
            snapshot: expect.objectContaining({
              status: 'done',
              output: { value: 3 },
            }),
          }),
        ),
      );
    } finally {
      actor.stop();
      inspection.stop();
      for (const socket of server.clients) socket.terminate();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      rmSync(home, { recursive: true, force: true });
    }
  },
);

it.each([
  { environment: 'production', development: true },
  { environment: 'development', development: false },
])('does not inspect outside development: %j', (options) => {
  vi.stubEnv('ARGO_MACHINE_LOG', '1');
  vi.stubEnv('ARGO_MACHINE_INSPECT', '1');
  vi.stubEnv('NODE_ENV', options.environment);
  const inspection = createNodeMachineInspection({
    home: '/unused',
    processName: 'desktop',
    development: options.development,
  });
  expect(inspection.inspect).toBeUndefined();
  inspection.stop();
});
