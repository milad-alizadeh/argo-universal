import { keyHashOf } from '@repo/contracts';
import { startEngineTestHost } from '@repo/engine/mocks';
import { afterEach, describe, expect, it } from 'vitest';
import {
  endpointOf,
  nodeChannelPlatform,
  pairedNodeDevice,
} from '../../../../mocks/node-channel-platform';
import type { BrowseServers } from '../discovery/resolve-server';
import { openConnection } from './open-connection';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close();
});

// The network as a phone hears it: one Server announcing itself, with this key, on this port.
const announcing =
  (key: string, port: number): BrowseServers =>
  (listener) => {
    listener([
      {
        name: 'Studio',
        keyHash: keyHashOf(key),
        addresses: ['127.0.0.1'],
        port,
      },
    ]);

    return () => {};
  };

// A port nothing listens on: where a Server was, before its computer moved.
async function deadPort(): Promise<number> {
  const gone = await startEngineTestHost();
  await gone.stop();

  return Number(new URL(gone.url).port);
}

describe('openConnection to a paired Server that has moved', () => {
  it('finds the Server where it announces itself now, when the address Pairing kept does not answer', async () => {
    const host = await startEngineTestHost({ version: '1.2.3' });
    const device = await pairedNodeDevice(host);
    const endpoint = await endpointOf(host);

    closers.push(host.stop);

    const { client, close } = openConnection(
      { ...endpoint, port: await deadPort() },
      nodeChannelPlatform(device),
      announcing(endpoint.serverPublicKey, endpoint.port),
    );

    closers.push(close);

    expect(await client.system.info.query()).toMatchObject({
      version: '1.2.3',
    });
  });
});
