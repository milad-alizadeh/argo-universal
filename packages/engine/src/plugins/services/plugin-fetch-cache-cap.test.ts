import type { FetchReply } from '@repo/contracts/plugins/argo-calls';
import { describe, expect, it } from 'vitest';
import { PluginFetchCache, concurrentPerHostLimit } from './plugin-fetch-cache';
import { hopOf, reply } from './plugin-fetch-cache-fixtures';
import type { Hop } from './plugin-fetch-response';

type SlowService = {
  fetch: (hop: Hop) => Promise<FetchReply>;
  inFlight: () => number;
  peak: () => number;
  // How many requests reached the service, and the ones among them not answered yet.
  reached: () => number;
  waiting: ((answer?: FetchReply) => void)[];
};

// A cache in front of a service that holds every request it gets until told to answer it.
function slowService(): SlowService {
  const cache = new PluginFetchCache({ now: (): number => 1_000_000 });
  const waiting: SlowService['waiting'] = [];
  let active = 0;
  let peak = 0;
  let reached = 0;

  const send = (): Promise<FetchReply> => {
    active += 1;
    reached += 1;
    peak = Math.max(peak, active);

    return new Promise((resolve) => {
      waiting.push((answer = reply(200)) => {
        active -= 1;
        resolve(answer);
      });
    });
  };

  return {
    fetch: (hop) => cache.fetch(hop, send),
    reached: () => reached,
    inFlight: () => active,
    peak: () => peak,
    waiting,
  };
}

const settle = async (): Promise<void> => {
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
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
      github.waiting.shift()?.();
      await settle();
    }

    await Promise.all(pulls);
    expect(github.peak()).toBe(concurrentPerHostLimit);
  });

  it('refuses a request that waited for its turn when a 429 that landed meanwhile closed the origin, and never sends it', async () => {
    const github = slowService();

    const pulls = Array.from({ length: concurrentPerHostLimit + 1 }, (_, n) =>
      github.fetch(hopOf(`/pulls/${n}`)),
    );

    await settle();
    expect(github.reached()).toBe(concurrentPerHostLimit);

    github.waiting.shift()?.(reply(429, { 'retry-after': '60' }));
    await settle();

    expect(github.reached()).toBe(concurrentPerHostLimit);

    for (const answer of github.waiting.splice(0)) answer();

    const answers = await Promise.all(pulls);

    expect(answers.at(-1)).toMatchObject({ status: 429 });
    expect(github.reached()).toBe(concurrentPerHostLimit);
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
