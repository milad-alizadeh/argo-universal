import { keyHashOf } from '@repo/contracts';
import { expect, it, onTestFinished, vi } from 'vitest';
import { lanAddress, watchAnnouncedServers } from '#mocks/engine-network';
import { announceWhileLocalNetworkAccessIsOn } from './advertiser';
import type { LocalNetworkAccess } from './local-network-access';

const key = 'a-key-for-a-moved-computer';

const on = {
  enabled: true,
  subscribe: (): (() => void) => (): void => undefined,
} as unknown as LocalNetworkAccess;

const announcement = { name: 'Moved Mac', key, port: 4000 };

function listen(): { isHeard: () => boolean } {
  let heard = false;

  const stop = watchAnnouncedServers((servers): void => {
    heard = servers.some((server) => server.keyHash === keyHashOf(key));
  });
  onTestFinished(stop);

  return { isHeard: (): boolean => heard };
}

function announceOn(addresses: () => string[], lines: string[]): void {
  const stop = announceWhileLocalNetworkAccessIsOn(
    on,
    announcement,
    (line): void => void lines.push(line),
    { addresses, checkEveryMs: 50 },
  );

  onTestFinished(stop);
}

it.skipIf(!lanAddress)(
  'announces on a network the computer joins after the Server started',
  { timeout: 20_000 },
  async () => {
    let now: string[] = [];
    const lines: string[] = [];
    const network = listen();

    announceOn(() => now, lines);
    now = lanAddress ? [lanAddress] : [];

    await vi.waitFor(() => expect(network.isHeard()).toBe(true), {
      timeout: 8000,
    });
    expect(lines.join('\n')).toContain(`${lanAddress}`);
  },
);

it.skipIf(!lanAddress)(
  'says at start what it announced, on which addresses and port',
  async () => {
    const lines: string[] = [];

    announceOn(() => (lanAddress ? [lanAddress] : []), lines);

    await vi.waitFor(() =>
      expect(lines).toContain(
        `announcing "Moved Mac" on ${lanAddress} port 4000`,
      ),
    );
  },
);
