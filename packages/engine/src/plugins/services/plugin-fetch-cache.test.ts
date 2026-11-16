import type { FetchReply } from '@repo/contracts/plugins/argo-calls';
import { describe, expect, it } from 'vitest';
import {
  defaultBackoffMs,
  keptRepliesLimit,
  PluginFetchCache,
} from './plugin-fetch-cache';
import type { Hop } from './plugin-fetch-response';

const reply = (
  status: number,
  headers: Record<string, string> = {},
  body = '',
): FetchReply => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers,
  body,
  truncated: false,
});

const hopOf = (
  path: string,
  headers: Record<string, string> = { authorization: 'Bearer one' },
  method = 'GET',
): Hop => ({
  url: new URL(`https://api.github.com${path}`),
  method,
  headers,
});

type Service = {
  cache: PluginFetchCache;
  sent: Hop[];
  answer: (next: FetchReply) => void;
  clock: { now: () => number; advance: (ms: number) => void };
  fetch: (hop: Hop) => Promise<FetchReply>;
};

function service(): Service {
  let now = 1_000_000;
  let answer = reply(200);
  const sent: Hop[] = [];
  const clock = {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
  const cache = new PluginFetchCache(clock);

  return {
    cache,
    sent,
    clock,
    answer: (next) => {
      answer = next;
    },
    fetch: (hop) =>
      cache.fetch(hop, async (asked) => {
        sent.push(asked);

        return answer;
      }),
  };
}

describe('conditional GETs', () => {
  it('asks again with the kept etag, and a 304 answers the kept reply', async () => {
    const github = service();
    const first = reply(200, { etag: '"a"' }, '{"title":"One"}');

    github.answer(first);
    await github.fetch(hopOf('/repos/o/r/pulls/1'));
    github.answer(reply(304));

    expect(await github.fetch(hopOf('/repos/o/r/pulls/1'))).toEqual(first);
    expect(github.sent[1]?.headers['if-none-match']).toBe('"a"');
  });

  it('asks with last-modified when the reply gave no etag', async () => {
    const github = service();

    github.answer(reply(200, { 'Last-Modified': 'Mon, 16 Nov 2026' }));
    await github.fetch(hopOf('/a'));
    await github.fetch(hopOf('/a'));

    expect(github.sent[1]?.headers['if-modified-since']).toBe(
      'Mon, 16 Nov 2026',
    );
  });

  it('keeps a fresh reply over the old one', async () => {
    const github = service();
    const fresh = reply(200, { etag: '"b"' }, 'fresh');

    github.answer(reply(200, { etag: '"a"' }, 'old'));
    await github.fetch(hopOf('/a'));
    github.answer(fresh);

    expect(await github.fetch(hopOf('/a'))).toEqual(fresh);
    github.answer(reply(304));
    expect(await github.fetch(hopOf('/a'))).toEqual(fresh);
    expect(github.sent[2]?.headers['if-none-match']).toBe('"b"');
  });

  it('never shares a kept reply across credentials', async () => {
    const github = service();

    github.answer(reply(200, { etag: '"a"' }));
    await github.fetch(hopOf('/a'));
    await github.fetch(hopOf('/a', { authorization: 'Bearer two' }));

    expect(github.sent[1]?.headers['if-none-match']).toBeUndefined();
  });

  it('sends a POST and a Plugin’s own conditional GET as asked', async () => {
    const github = service();
    const own = hopOf('/a', { authorization: 'x', 'If-None-Match': '"mine"' });

    github.answer(reply(200, { etag: '"a"' }));
    await github.fetch(hopOf('/a', { authorization: 'x' }, 'POST'));
    await github.fetch(hopOf('/a', { authorization: 'x' }, 'POST'));
    await github.fetch(own);
    github.answer(reply(304));

    expect(await github.fetch(own)).toEqual(reply(304));
    expect(github.sent.map(({ headers }) => headers)).toEqual([
      { authorization: 'x' },
      { authorization: 'x' },
      own.headers,
      own.headers,
    ]);
  });

  it('keeps neither a truncated nor a failed reply', async () => {
    const github = service();

    github.answer({ ...reply(200, { etag: '"a"' }), truncated: true });
    await github.fetch(hopOf('/a'));
    github.answer(reply(500, { etag: '"a"' }));
    await github.fetch(hopOf('/a'));
    await github.fetch(hopOf('/a'));

    expect(
      github.sent.map(({ headers }) => headers['if-none-match']),
    ).toEqual([undefined, undefined, undefined]);
  });

  it('drops the least recently used reply past its limit', async () => {
    const github = service();

    github.answer(reply(200, { etag: '"a"' }));
    for (let page = 0; page <= keptRepliesLimit; page += 1)
      await github.fetch(hopOf(`/page/${page}`));
    await github.fetch(hopOf('/page/0'));

    expect(github.sent.at(-1)?.headers['if-none-match']).toBeUndefined();
  });
});

describe('rate limits', () => {
  it('sends nothing to a limited origin until retry-after, and answers 429 with the time left', async () => {
    const github = service();

    github.answer(reply(429, { 'retry-after': '30' }));
    await github.fetch(hopOf('/a'));
    github.clock.advance(10_000);

    expect(await github.fetch(hopOf('/b'))).toEqual({
      ...reply(429, { 'retry-after': '20' }),
      statusText: 'Too Many Requests',
    });
    expect(github.sent).toHaveLength(1);

    github.clock.advance(20_000);
    github.answer(reply(200));
    await github.fetch(hopOf('/b'));
    expect(github.sent).toHaveLength(2);
  });

  it('closes on a 403 that says the limit is spent, until its reset', async () => {
    const github = service();
    const reset = (github.clock.now() + 90_000) / 1000;

    github.answer(
      reply(403, {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(reset),
      }),
    );
    await github.fetch(hopOf('/a'));
    github.clock.advance(89_000);
    await github.fetch(hopOf('/a'));

    expect(github.sent).toHaveLength(1);
    github.clock.advance(1000);
    await github.fetch(hopOf('/a'));
    expect(github.sent).toHaveLength(2);
  });

  it('closes for a minute when a 429 says not until when', async () => {
    const github = service();

    github.answer(reply(429));
    await github.fetch(hopOf('/a'));
    github.clock.advance(defaultBackoffMs - 1);
    await github.fetch(hopOf('/a'));

    expect(github.sent).toHaveLength(1);
  });

  it('leaves a plain 403 open, and another credential open', async () => {
    const github = service();

    github.answer(reply(403));
    await github.fetch(hopOf('/a'));
    await github.fetch(hopOf('/a'));
    github.answer(reply(429, { 'retry-after': '60' }));
    await github.fetch(hopOf('/a'));
    await github.fetch(hopOf('/a', { authorization: 'Bearer two' }));

    expect(github.sent).toHaveLength(4);
  });
});
