import { startEngineTestHost } from '@repo/engine/mocks';
import { expect, it } from 'vitest';
import {
  endpointOf,
  nodeChannelPlatform,
  nodeRandomBytes,
  newDeviceKey,
} from '../../../../mocks/node-channel-platform';
import { opener } from './channel/channel-transport';
import { PairingRefused } from './channel/open-channel';
import type { Keypair } from './channel/x25519';
import { pairWithServer } from './pair-with-server';

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

// The owner pressing Allow or Decline on the Server Device once a Device is asking.
async function answer(host: Host, verb: 'allow' | 'decline'): Promise<void> {
  for await (const asking of await host.caller.pairing.registered()) {
    await host.caller.pairing[verb]({ deviceId: asking.deviceId });

    return;
  }
}

it('pairs when the owner allows, and then connects with the Device Key alone', async () => {
  const host = await startEngineTestHost();
  const endpoint = await endpointOf(host);
  const platform = nodeChannelPlatform();
  const { ticket } = host.pairing.mint();

  const [paired] = await Promise.all([
    pairWithServer(endpoint, ticket, { platform }),
    answer(host, 'allow'),
  ]);

  expect(paired.deviceId).toEqual(expect.any(String));
  expect(await host.caller.devices.list()).toHaveLength(2);

  const again = await opener(
    { address: endpoint, serverPublicKey: endpoint.serverPublicKey },
    platform,
  )();

  expect(again.deviceId).toBe(paired.deviceId);
  again.stream.close();
});

it("rejects with the Server's refusal when the owner says no", async () => {
  const host = await startEngineTestHost();
  const endpoint = await endpointOf(host);
  const { ticket } = host.pairing.mint();

  const [refused] = await Promise.allSettled([
    pairWithServer(endpoint, ticket, { platform: nodeChannelPlatform() }),
    answer(host, 'decline'),
  ]);

  expect(refused).toMatchObject({
    status: 'rejected',
    reason: new PairingRefused('declined'),
  });
  expect(await host.caller.devices.list()).toHaveLength(1);
});

it('says the code is unknown when it was never minted', async () => {
  const host = await startEngineTestHost();

  await expect(
    pairWithServer(await endpointOf(host), '000000', {
      platform: nodeChannelPlatform(),
    }),
  ).rejects.toBeInstanceOf(PairingRefused);
});

it('reads the Device Key once when two channels open together', async () => {
  let reads = 0;

  const platform = {
    ...nodeChannelPlatform(),
    deviceKey: async (): Promise<Keypair> => {
      reads += 1;

      return newDeviceKey();
    },
    openSocket: (): Promise<never> =>
      Promise.reject(new Error('no network in this test')),
    randomBytes: nodeRandomBytes,
  };

  const open = opener(
    { address: { host: '127.0.0.1', port: 1 }, serverPublicKey: 'x' },
    platform,
  );

  await Promise.allSettled([open(), open()]);

  expect(reads).toBe(1);
});
