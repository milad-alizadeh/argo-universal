import { request } from 'node:http';
import { connect, type Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  channelClosed,
  connectAsDevice,
  openChannel,
} from '#mocks/engine-channel';
import { lanAddress } from '#mocks/engine-network';
import { channelMagic } from '../pairing/channel-door';

const portOf = (url: string): number => Number(new URL(url).port);

// The HTTP status of a plain request, or 0 when the Server closed the socket instead of answering.
const plainStatus = (
  host: string | undefined,
  port: number,
  path: string,
): Promise<number> =>
  new Promise<number>((resolve, reject): void => {
    const outgoing = request({ host, port, path }, (response): void => {
      resolve(response.statusCode ?? 0);
      response.resume();
    });

    outgoing.once('error', (error: NodeJS.ErrnoException): void =>
      error.code === 'ECONNRESET' ? resolve(0) : reject(error),
    );
    outgoing.end();
  });

// Everything the Server serves over plain HTTP: the API, a Blob and a Plugin asset.
const apiPath = '/trpc/system.info';

const paths = [apiPath, '/blobs/anything', '/plugin-assets/probe/x'];

it('serves this computer own App over plain HTTP, as the Server Device', async (): Promise<void> => {
  const { url } = await startEngineTestHost();

  expect(await plainStatus('127.0.0.1', portOf(url), apiPath)).toBe(200);
});

const opened = (port: number): Promise<Socket> =>
  new Promise<Socket>((resolve): void => {
    const socket = connect(port, '127.0.0.1', (): void => resolve(socket));
  });

const arrived = (): Promise<void> =>
  new Promise<void>((resolve): void => void setTimeout(resolve, 50));

// Opens a raw socket on the front door, says `opening` and nothing more, then vanishes the way a peer that resets its connection does.
async function resetAfter(port: number, opening: Buffer): Promise<void> {
  const socket = await opened(port);

  if (opening.length > 0) socket.write(opening);
  await arrived();
  socket.resetAndDestroy();
  await arrived();
}

/*
 * How far into its arrival a socket can be when its peer resets it. Nothing here needs a Pairing Ticket or the Server's static key, so each one is what anybody who can reach the port could send.
 * A raw socket with no `'error'` listener raises an uncaught exception when it is reset, which ends the Server: the Server still answering afterwards is the whole point of these.
 */
const resets: readonly [string, Buffer][] = [
  ['before it says anything at all', Buffer.alloc(0)],
  [
    'part way through the bytes the door reads first',
    channelMagic.subarray(0, 2),
  ],
  ['once it has said it wants a channel, and no more', channelMagic],
  [
    'having claimed a handshake of 65535 bytes it never sends',
    Buffer.concat([channelMagic, Buffer.from([0xff, 0xff])]),
  ],
];

describe.each(resets)('a Connection reset %s', (_name, opening) => {
  it('leaves the Server answering', async (): Promise<void> => {
    const { url } = await startEngineTestHost();
    const port = portOf(url);

    await resetAfter(port, opening);

    expect(await plainStatus('127.0.0.1', port, apiPath)).toBe(200);
  });
});

// A computer with no network has no address another Device could use.
describe.skipIf(!lanAddress)(
  'reached the way another Device reaches it',
  () => {
    it('answers nothing at all over plain HTTP, however the Server is bound', async (): Promise<void> => {
      const host = await startEngineTestHost();
      const port = portOf(host.url);
      await host.caller.network.setLocalAccess({ enabled: true });

      for (const path of paths)
        expect(await plainStatus(lanAddress, port, path)).toBe(0);

      expect(await plainStatus('127.0.0.1', port, apiPath)).toBe(200);
    });

    it('answers a Device that handshakes, and only while the owner leaves the network on', async (): Promise<void> => {
      const host = await startEngineTestHost();
      await host.caller.network.setLocalAccess({ enabled: true });
      const { ticket } = host.pairing.mint();
      const device = await connectAsDevice(host, { ticket, host: lanAddress });

      expect(await device.caller.system.info.query()).toMatchObject({
        version: '1.2.3',
      });

      const open = await openChannel(host, {
        deviceKey: device.deviceKey,
        host: lanAddress,
      });

      await host.caller.network.setLocalAccess({ enabled: false });

      await channelClosed(open.socket);
      await expect(device.caller.system.info.query()).rejects.toThrow(
        /ECONNREFUSED/,
      );
    });
  },
);
