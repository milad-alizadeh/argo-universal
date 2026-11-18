import { describe, expect, it } from 'vitest';
import { hopOf, reply, service } from './plugin-fetch-cache-fixtures';
import { defaultBackoffMs } from './plugin-rate-limit';

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

  it('tells a Query that read since the limit tripped, or was refused by it, when it reopens, and one that read before or after nothing', async () => {
    const github = service();
    const started = github.clock.now();

    github.answer(reply(429, { 'retry-after': '30' }));
    await github.fetch(hopOf('/a'));
    expect(github.limitedUntil(started)).toBe(started + 30_000);

    github.clock.advance(10_000);
    expect(github.limitedUntil(github.clock.now())).toBeUndefined();

    await github.fetch(hopOf('/b'));
    expect(github.limitedUntil(github.clock.now())).toBe(started + 30_000);

    github.clock.advance(20_000);
    expect(github.limitedUntil(started)).toBeUndefined();
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
