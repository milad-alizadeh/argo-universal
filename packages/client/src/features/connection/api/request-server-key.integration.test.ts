import { startEngineTestHost } from '@repo/engine/mocks';
import { expect, it } from 'vitest';
import {
  endpointOf,
  nodeChannelPlatform,
} from '../../../../mocks/node-channel-platform';
import { PairingRefused } from './channel/open-channel';
import { requestServerKey } from './request-server-key';

const platform = nodeChannelPlatform();

it("is given the Server's key by a code that App and Server both hold", async () => {
  const host = await startEngineTestHost();
  const endpoint = await endpointOf(host);
  const { ticket } = host.pairing.mint();

  await expect(requestServerKey(endpoint, ticket, { platform })).resolves.toBe(
    endpoint.serverPublicKey,
  );
});

it('is refused by a Server that was never told the code', async () => {
  const host = await startEngineTestHost();
  const endpoint = await endpointOf(host);
  const { ticket } = host.pairing.mint();
  const wrong = ticket === '000000' ? '111111' : '000000';

  await expect(requestServerKey(endpoint, wrong, { platform })).rejects.toEqual(
    new PairingRefused('ticket-unknown'),
  );
});
