import { startEngineTestHost } from '@repo/engine/mocks';
import { AppPageSocket } from '@repo/engine/mocks/app-socket';
import {
  lanAddress,
  watchAnnouncedServers,
} from '@repo/engine/mocks/engine-network';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openConnection } from '../api/open-connection';
import { resolveServer, type ServerLocation } from './resolve-server';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();

  for (const close of closers.splice(0).reverse()) await close();
});

type TestServer = Awaited<ReturnType<typeof startEngineTestHost>>;

const portOf = (server: TestServer): number => Number(new URL(server.url).port);

// The Server on the local network, as the owner leaves it after pairing: reachable beyond this computer and announcing itself.
async function startOnTheNetwork(
  options: Parameters<typeof startEngineTestHost>[0] = {},
): Promise<TestServer> {
  const server = await startEngineTestHost(options);

  closers.push(server.stop);
  await server.caller.network.setLocalAccess({ enabled: true });

  return server;
}

const keyOf = async (server: TestServer): Promise<string> =>
  (await server.caller.devices.serverKey()).publicKey;

/*
 * What a connect then does with the answer: opens the Connection and asks the Server who it is.
 * Only from this computer; a Server announcing itself on the local network answers a paired Device over the encrypted channel and nothing else (ADR-0045).
 */
async function nameReachedAt(location: ServerLocation): Promise<string> {
  // Node writes no Origin, so the App stands in for its own page, which is what proves the Server Device (#1696).
  vi.stubGlobal('WebSocket', AppPageSocket);

  const { client, close } = openConnection({
    url: `ws://${location.hosts[0]}:${location.port}`,
  });

  closers.push(close);

  return (await client.system.info.query()).name;
}

const computerName = 'Studio Mac';

const nothingThere = { host: '192.0.2.1', port: 9 };

// A computer with no network has no interface to announce on.
describe.skipIf(!lanAddress)(
  'on a computer with a network',
  { timeout: 20_000 },
  () => {
    it('finds a Server whose address changed, by asking the network for it', async (): Promise<void> => {
      const server = await startOnTheNetwork({ discoveryName: computerName });

      const known = {
        name: computerName,
        key: await keyOf(server),
        address: nothingThere,
      };

      const location = await resolveServer(known, watchAnnouncedServers);

      expect(location).toMatchObject({
        source: 'discovery',
        name: computerName,
        port: portOf(server),
      });
      expect(location.hosts).toContain(lanAddress);
    });

    it('finds the same Server after a rename and a move to another port', async (): Promise<void> => {
      const before = await startEngineTestHost({ discoveryName: 'Old name' });

      const known = {
        name: 'Old name',
        key: await keyOf(before),
        address: { host: lanAddress ?? '', port: portOf(before) },
      };

      await before.stop();

      const after = await startOnTheNetwork({
        home: before.home,
        discoveryName: 'New name',
      });

      const location = await resolveServer(known, watchAnnouncedServers);

      expect(location).toMatchObject({
        source: 'discovery',
        name: 'New name',
        port: portOf(after),
      });
      expect(portOf(after)).not.toBe(known.address.port);
    });

    it('takes the Server by its key and refuses the same name under another key', async (): Promise<void> => {
      const server = await startOnTheNetwork({ discoveryName: computerName });
      const key = await keyOf(server);

      const right = await resolveServer(
        { name: computerName, key },
        watchAnnouncedServers,
      );

      const wrong = resolveServer(
        { name: computerName, key: 'not-its-key' },
        watchAnnouncedServers,
        1500,
      );

      expect(right).toMatchObject({ source: 'discovery' });
      await expect(wrong).rejects.toThrow(computerName);
    });

    it('falls back to the stored address when nothing announces itself', async (): Promise<void> => {
      const server = await startEngineTestHost();

      const known = {
        name: computerName,
        key: await keyOf(server),
        address: { host: '127.0.0.1', port: portOf(server) },
      };

      const location = await resolveServer(known, watchAnnouncedServers, 1500);

      expect(location).toMatchObject({
        source: 'address',
        hosts: ['127.0.0.1'],
        port: portOf(server),
      });
      expect(await nameReachedAt(location)).toBeTruthy();
    });

    it('uses the stored address when the browser cannot start', async (): Promise<void> => {
      const known = { name: computerName, key: 'k', address: nothingThere };

      const location = await resolveServer(known, () => {
        throw new Error('native module is not linked');
      });

      expect(location).toMatchObject({ source: 'address', port: 9 });
    });
  },
);

it('answers from the stored address at once where nothing can browse', async (): Promise<void> => {
  const known = { name: computerName, key: 'k', address: nothingThere };

  expect(await resolveServer(known, null)).toMatchObject({
    source: 'address',
  });
  await expect(
    resolveServer({ name: computerName, key: 'k' }, null),
  ).rejects.toThrow(computerName);
});
