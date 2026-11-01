import { createServer as createRequests } from 'node:http';
import { connect, type Server, type Socket } from 'node:net';
import { findFreePort } from '@repo/mocks/network/free-port';
import { afterEach, describe, expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { channelMagic } from '../pairing/channel-door';
import { createFrontDoor } from './front-door';
import { SocketGuard } from './socket-guard';

const doors: Server[] = [];

afterEach((): void => {
  for (const door of doors.splice(0)) door.close();
});

const opened = (port: number): Promise<Socket> =>
  new Promise<Socket>((resolve): void => {
    const socket = connect(port, '127.0.0.1', (): void => resolve(socket));

    socket.on('error', (): void => {});
  });

const closedByServer = (socket: Socket): Promise<void> =>
  new Promise<void>((resolve): void => void socket.once('close', resolve));

const settled = (): Promise<void> =>
  new Promise<void>((resolve): void => void setTimeout(resolve, 50));

// A door of its own with short limits, whose channel takes a socket and never finishes the handshake.
async function stalledDoor(limits: {
  timeoutMs: number;
  most: number;
}): Promise<{ port: number; reports: string[] }> {
  const reports: string[] = [];
  const report = (subject: string): void => void reports.push(subject);
  const port = await findFreePort();

  const door = createFrontDoor({
    requests: createRequests(),
    channel: { accept: (): void => {} },
    key: { accept: (): void => {} },
    unproven: new SocketGuard({ report, ...limits }),
    report,
  });

  doors.push(door);
  await new Promise<void>(
    (resolve): void => void door.listen(port, '127.0.0.1', resolve),
  );

  return { port, reports };
}

it('closes a socket that claims a larger first message than any Device sends, without waiting for it', async (): Promise<void> => {
  const { url } = await startEngineTestHost();
  const socket = await opened(Number(new URL(url).port));

  socket.write(Buffer.concat([channelMagic, Buffer.from([0xff, 0xff])]));
  await closedByServer(socket);

  expect(socket.destroyed).toBe(true);
});

describe('a socket that stalls before it has said what it is', () => {
  it.each([
    ['without a byte', Buffer.alloc(0)],
    [
      'part way through the bytes the door reads first',
      channelMagic.subarray(0, 3),
    ],
  ])('is closed by the Server, %s', async (_name, opening): Promise<void> => {
    const { port, reports } = await stalledDoor({ timeoutMs: 100, most: 64 });
    const socket = await opened(port);

    if (opening.length > 0) socket.write(opening);
    await closedByServer(socket);

    expect(reports).toContain('Connection that stalled');
  });

  it('cannot hold more of the Server than the limit allows', async (): Promise<void> => {
    const { port, reports } = await stalledDoor({ timeoutMs: 5000, most: 3 });
    const held = await Promise.all([opened(port), opened(port), opened(port)]);
    const over = await opened(port);

    await closedByServer(over);

    expect(reports).toContain('Connection over the limit');
    expect(held.map((socket) => socket.destroyed)).toEqual([
      false,
      false,
      false,
    ]);

    for (const socket of held) socket.destroy();
  });

  it('frees its place when it goes', async (): Promise<void> => {
    const { port } = await stalledDoor({ timeoutMs: 5000, most: 1 });
    const first = await opened(port);

    first.destroy();
    await settled();
    const second = await opened(port);
    await settled();

    expect(second.destroyed).toBe(false);
    second.destroy();
  });
});
