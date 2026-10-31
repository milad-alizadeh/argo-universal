import { type DiscoveredServer, keyHashOf } from '@repo/contracts';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  lanAddress,
  ownAddresses,
  watchAnnouncedServers,
} from '#mocks/engine-network';
import { Identity } from './service-identity';

const heardWithin = 8000;

const computerName = 'Studio Mac';

const settle = (milliseconds: number): Promise<void> =>
  new Promise<void>((resolve): void => {
    setTimeout(resolve, milliseconds);
  });

// A browser on the same network, told nothing about any Server; `announced` finds one by the key it was given at pairing, as the hash the announcement carries.
interface Browser {
  announced: (key: string) => DiscoveredServer | undefined;
}

function browseTheNetwork(): Browser {
  let heard: readonly DiscoveredServer[] = [];

  const stop = watchAnnouncedServers((servers): void => {
    heard = servers;
  });

  onTestFinished(stop);

  return {
    announced: (key: string): DiscoveredServer | undefined =>
      heard.find((server) => server.keyHash === keyHashOf(key)),
  };
}

type TestServer = Awaited<ReturnType<typeof startEngineTestHost>>;

const keyOf = async (caller: TestServer['caller']): Promise<string> =>
  (await caller.devices.serverKey()).publicKey;

// A computer with no network has no interface to announce on.
describe.skipIf(!lanAddress)(
  'on a computer with a network',
  { timeout: 20_000 },
  () => {
    it('announces itself by name once Local network access is on, with no address given to the browser', async (): Promise<void> => {
      const { caller, url } = await startEngineTestHost({
        discoveryName: computerName,
      });

      const key = await keyOf(caller);
      const network = browseTheNetwork();

      await caller.network.setLocalAccess({ enabled: true });

      await vi.waitFor(() => expect(network.announced(key)).toBeDefined(), {
        timeout: heardWithin,
      });
      expect(network.announced(key)).toMatchObject({
        name: computerName,
        port: Number(new URL(url).port),
      });
      const { addresses } = network.announced(key) ?? { addresses: [] };

      expect(addresses.length).toBeGreaterThan(0);
      expect(ownAddresses).toEqual(expect.arrayContaining(addresses));
    });

    it('puts nothing derived from its key on the wire but the hash and the host label', (): void => {
      const key = 'a-static-public-key';

      const records = new Identity(
        { name: computerName, key, port: 4000 },
        '192.0.2.7',
      ).records(120);

      const wire = records.flatMap((record) => {
        const data: unknown = 'data' in record ? record.data : undefined;

        return Array.isArray(data) ? data.map(String) : [JSON.stringify(data)];
      });

      expect(wire).toContain(`keyhash=${keyHashOf(key)}`);
      expect(wire.filter((line) => line.includes(key))).toEqual([]);
      expect(wire.filter((line) => line.startsWith('keyhash='))).toHaveLength(
        1,
      );
      expect(wire.join('\n')).not.toContain(
        Buffer.from(key).toString('base64'),
      );
    });

    it('stays off the network while Local network access is off', async (): Promise<void> => {
      const { caller } = await startEngineTestHost();
      const network = browseTheNetwork();

      await settle(1500);

      expect(network.announced(await keyOf(caller))).toBeUndefined();
    });

    it('stops announcing when Local network access goes off, without a restart', async (): Promise<void> => {
      const { caller } = await startEngineTestHost();
      const key = await keyOf(caller);
      const network = browseTheNetwork();
      await caller.network.setLocalAccess({ enabled: true });
      await vi.waitFor(() => expect(network.announced(key)).toBeDefined(), {
        timeout: heardWithin,
      });

      await caller.network.setLocalAccess({ enabled: false });

      await vi.waitFor(() => expect(network.announced(key)).toBeUndefined(), {
        timeout: heardWithin,
      });
    });

    it('announces again after a restart that kept Local network access on', async (): Promise<void> => {
      const first = await startEngineTestHost();
      const key = await keyOf(first.caller);
      await first.caller.network.setLocalAccess({ enabled: true });
      await first.stop();
      const network = browseTheNetwork();

      await startEngineTestHost({ home: first.home });

      await vi.waitFor(() => expect(network.announced(key)).toBeDefined(), {
        timeout: heardWithin,
      });
    });

    it('says goodbye when the Server stops, so no App is left a stale entry', async (): Promise<void> => {
      const { caller, stop } = await startEngineTestHost();
      const key = await keyOf(caller);
      const network = browseTheNetwork();
      await caller.network.setLocalAccess({ enabled: true });
      await vi.waitFor(() => expect(network.announced(key)).toBeDefined(), {
        timeout: heardWithin,
      });

      await stop();

      await vi.waitFor(() => expect(network.announced(key)).toBeUndefined(), {
        timeout: heardWithin,
      });
    });
  },
);
