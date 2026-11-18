import { keyHashOf } from '@repo/contracts';
import { expect, it, onTestFinished, vi } from 'vitest';
import { lanAddress, watchAnnouncedServers } from '#mocks/engine-network';
import { announceWhileLocalNetworkAccessIsOn } from './advertiser';

const key = 'a-key-for-a-moved-computer';

const on = { enabled: true, subscribe: (): (() => void) => (): void => {} };

const announcement = { name: 'Moved Mac', key, port: 4000 };

function listen(): () => boolean {
  let heard = false;

  const stop = watchAnnouncedServers((servers): void => {
    heard = servers.some((server) => server.keyHash === keyHashOf(key));
  });

  onTestFinished(stop);

  return (): boolean => heard;
}

function announceOn(addresses: () => string[], lines: string[]): void {
  const stop = announceWhileLocalNetworkAccessIsOn(on, announcement, {
    report: (line): void => void lines.push(line),
    watch: { addresses, checkEveryMs: 50 },
  });

  onTestFinished(stop);
}

const own = lanAddress ? [lanAddress] : [];

it.skipIf(!lanAddress)(
  'announces on a network the computer joins after the Server started',
  { timeout: 20_000 },
  async () => {
    let now: string[] = [];
    const isHeard = listen();

    announceOn(() => now, []);
    expect(isHeard()).toBe(false);
    now = own;

    await vi.waitFor(() => expect(isHeard()).toBe(true), { timeout: 8000 });
  },
);

it.skipIf(!lanAddress)(
  'says at start what it announced, on which addresses and port',
  async () => {
    const lines: string[] = [];

    announceOn(() => own, lines);

    await vi.waitFor(() =>
      expect(lines).toContain(
        `announcing "Moved Mac" on ${lanAddress} port 4000`,
      ),
    );
  },
);
