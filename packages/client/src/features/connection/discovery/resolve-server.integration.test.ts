import { startEngineTestHost } from '@repo/engine/mocks';
import {
  lanAddress,
  watchAnnouncedServers,
} from '@repo/engine/mocks/engine-network';
import { afterEach, describe, expect, it } from 'vitest';
import { openConnection } from '../api/open-connection';
import { resolveServer, type ServerLocation } from './resolve-server';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close();
});

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

const portOf = (host: Host): number => Number(new URL(host.url).port);

// The Server on the local network, as the owner leaves it after pairing: reachable beyond this computer and announcing itself.
async function startOnTheNetwork(
  options: Parameters<typeof startEngineTestHost>[0] = {},
): Promise<Host> {
  const host = await startEngineTestHost(options);

  closers.push(host.stop);
  await host.caller.network.setLocalAccess({ enabled: true });

  return host;
}

const keyOf = async (host: Host): Promise<string> =>
  (await host.caller.devices.serverKey()).publicKey;

// What a connect then does with the answer: opens the Connection and asks the Server who it is.
async function nameReachedAt(location: ServerLocation): Promise<string> {
  const { client, close } = openConnection(
    `ws://${location.hosts[0]}:${location.port}`,
  );

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
        port: portOf(server),
      });
      expect(await nameReachedAt(location)).toBe(
        (await server.caller.system.info()).name,
      );
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

    it('does not take a computer that answers to the right name with the wrong key', async (): Promise<void> => {
      await startOnTheNetwork({ discoveryName: computerName });

      const known = { name: computerName, key: 'not-its-key' };

      await expect(
        resolveServer(known, watchAnnouncedServers, 1500),
      ).rejects.toThrow(computerName);
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
  },
);
