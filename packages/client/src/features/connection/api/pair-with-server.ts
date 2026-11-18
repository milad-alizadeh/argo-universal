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
  options: PairOptions,
): Promise<{ deviceId: string }> {
  const platform = options.platform ?? appChannelPlatform;
  const target = targetOf(endpoint, ticket, options.onReached);
  const opening = opener(target, platform)();

  options.signal?.addEventListener('abort', () => void closeWhenOpen(opening));

  const { stream, deviceId } = await opening;
  stream.close();

  return { deviceId };
}

export interface PairOptions {
  platform?: ChannelPlatform;
  signal?: AbortSignal;
  // Called once the Server says the owner's Allow prompt is up, so the App says it waits on the owner only then.
  onReached?: () => void;
}

const targetOf = (
  endpoint: PairedEndpoint,
  ticket: string,
  onAsked: (() => void) | undefined,
): ChannelTarget => ({
  address: { host: endpoint.host, port: endpoint.port },
  serverPublicKey: endpoint.serverPublicKey,
  ticket,
  onAsked,
});

async function closeWhenOpen(opening: Promise<OpenedChannel>): Promise<void> {
  try {
    (await opening).stream.close();
  } catch {
    // It never opened, so there is nothing to close.
  }
}
