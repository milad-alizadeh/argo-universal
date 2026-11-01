import { appChannelPlatform } from './channel/channel-platform';
import {
  type ChannelPlatform,
  type ChannelTarget,
  opener,
} from './channel/channel-transport';
import type { OpenedChannel } from './channel/open-channel';
import type { PairedEndpoint } from './server-endpoint';

/*
 * Pairs this Device with the Server at `endpoint`: one Connection that spends the Pairing Ticket and is closed again. It settles when the owner has answered on the Server Device, because the Server holds a registration until they do (ADR-0045), so the wait is this promise's.
 * A Server that says no rejects with `PairingRefused`. Aborting does not stop the Server asking; it only closes the channel if the owner then allows it, so the Device is paired and the App has stopped listening.
 */
export async function pairWithServer(
  endpoint: PairedEndpoint,
  ticket: string,
  options: { platform?: ChannelPlatform; signal?: AbortSignal },
): Promise<{ deviceId: string }> {
  const platform = options.platform ?? appChannelPlatform;
  const opening = opener(targetOf(endpoint, ticket), platform)();

  options.signal?.addEventListener('abort', () => void closeWhenOpen(opening));

  const { stream, deviceId } = await opening;
  stream.close();

  return { deviceId };
}

const targetOf = (endpoint: PairedEndpoint, ticket: string): ChannelTarget => ({
  address: { host: endpoint.host, port: endpoint.port },
  serverPublicKey: endpoint.serverPublicKey,
  ticket,
});

async function closeWhenOpen(opening: Promise<OpenedChannel>): Promise<void> {
  try {
    (await opening).stream.close();
  } catch {
    // It never opened, so there is nothing to close.
  }
}
