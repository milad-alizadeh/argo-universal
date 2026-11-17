import type { FetchReply } from '@repo/contracts/plugins/argo-calls';
import { describe, expect, it } from 'vitest';
import {
  PluginFetchCache,
  concurrentPerHostLimit,
} from './plugin-fetch-cache';
import { hopOf, reply } from './plugin-fetch-cache-fixtures';

type Waiting = { release: () => void };

// A cache in front of a service that holds every request it gets until told to answer it.
function slowService(): {
  fetch: PluginFetchCache['fetch'];
  inFlight: () => number;
  peak: () => number;
  waiting: Waiting[];
} {
  const cache = new PluginFetchCache({ now: () => 1_000_000 });
  const waiting: Waiting[] = [];
  let active = 0;
  let peak = 0;

  const send = (): Promise<FetchReply> => {
    active += 1;
    peak = Math.max(peak, active);

    return new Promise((resolve) => {
      waiting.push({
        release: () => {
          active -= 1;
          resolve(reply(200));
        },
      });
    });
  };

  return {
    fetch: (hop) => cache.fetch(hop, send),
    inFlight: () => active,
    peak: () => peak,
    waiting,
  };
}

const settle = async (): Promise<void> => {
  await new Promise((resolve) => setImmediate(resolve));
};

describe('concurrent requests per host', () => {
  it('sends at most the cap at once to one host, and the rest as those answer', async () => {
    const github = slowService();
    const pulls = Array.from({ length: 20 }, (_, n) =>
      github.fetch(hopOf(`/pulls/${n}`)),
    );

    await settle();
    expect(github.inFlight()).toBe(concurrentPerHostLimit);

    while (github.waiting.length > 0) {
      github.waiting.shift()?.release();
      await settle();
    }

    await Promise.all(pulls);
    expect(github.peak()).toBe(concurrentPerHostLimit);
  });

  it('does not hold one host back for another', async () => {
    const github = slowService();

    for (let n = 0; n < concurrentPerHostLimit; n += 1)
      void github.fetch(hopOf(`/pulls/${n}`));

    void github.fetch({
      ...hopOf('/x'),
      url: new URL('https://example.com/x'),
    });
    await settle();

    expect(github.inFlight()).toBe(concurrentPerHostLimit + 1);
  });
});
