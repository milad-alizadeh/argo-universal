import type { AppRouter } from '@repo/api';
import { createTRPCClient } from '@trpc/client';
import { describe, expect, it } from 'vitest';
import { fails, pending, trpcMockLink } from './trpc-mock-link';

const serverStartedAt = '2026-10-03T00:00:00.000Z';

const systemInfo = {
  version: '1.2.3',
  startedAt: serverStartedAt,
  pid: 4242,
  name: "Milad's Mac mini",
};

describe('trpcMockLink', () => {
  it('answers a query with its fixture', async () => {
    const client = createTRPCClient<AppRouter>({
      links: [trpcMockLink({ 'system.info': () => systemInfo })],
    });

    expect(await client.system.info.query()).toEqual(systemInfo);
  });

  it('streams a subscription from its generator fixture', async () => {
    const client = createTRPCClient<AppRouter>({
      links: [
        trpcMockLink({
          'system.clock': async function* () {
            yield { now: serverStartedAt };
            yield { now: '2026-10-03T00:00:01.000Z' };
          },
        }),
      ],
    });

    const received = await new Promise<unknown[]>((resolve, reject) => {
      const ticks: unknown[] = [];
      client.system.clock.subscribe(undefined, {
        onData: (tick) => ticks.push(tick),
        onComplete: () => resolve(ticks),
        onError: reject,
      });
    });

    expect(received).toEqual([
      { now: serverStartedAt },
      { now: '2026-10-03T00:00:01.000Z' },
    ]);
  });

  it('fails a procedure that has no fixture', async () => {
    const client = createTRPCClient<AppRouter>({ links: [trpcMockLink({})] });

    await expect(client.system.info.query()).rejects.toThrow(
      'No story mock for system.info',
    );
  });

  it('fails with the message that fails() gets', async () => {
    const client = createTRPCClient<AppRouter>({
      links: [trpcMockLink({ 'system.info': fails('Server is down') })],
    });

    await expect(client.system.info.query()).rejects.toThrow('Server is down');
  });

  it('never answers a pending() query', async () => {
    const client = createTRPCClient<AppRouter>({
      links: [trpcMockLink({ 'system.info': pending() })],
    });

    const outcome = await Promise.race([
      client.system.info.query().then(() => 'answered'),
      new Promise((resolve) => setTimeout(() => resolve('waiting'), 50)),
    ]);

    expect(outcome).toBe('waiting');
  });
});
