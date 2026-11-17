import { describe, expect, it } from 'vitest';
import { keptBytesLimit, keptRepliesLimit } from './plugin-fetch-cache';
import { hopOf, reply, service } from './plugin-fetch-cache-fixtures';

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

    expect(github.sent.map(({ headers }) => headers['if-none-match'])).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('drops the oldest reply once the kept bodies pass their byte budget', async () => {
    const github = service();
    const half = 'x'.repeat(keptBytesLimit / 2 + 1);

    github.answer(reply(200, { etag: '"a"' }, half));
    await github.fetch(hopOf('/big/1'));
    await github.fetch(hopOf('/big/2'));
    await github.fetch(hopOf('/big/2'));
    await github.fetch(hopOf('/big/1'));

    expect(github.sent.map(({ headers }) => headers['if-none-match'])).toEqual([
      undefined,
      undefined,
      '"a"',
      undefined,
    ]);
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
