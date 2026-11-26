import { expect, it } from 'vitest';
import { hopOf, reply, service } from './plugin-fetch-cache-fixtures';

// The fixture clock starts at 1,000 seconds; a limit that resets an hour later.
const resetSecond = 4600;

const limits = (
  remaining: number,
  resource = 'core',
  reset = resetSecond,
): Record<string, string> => ({
  'X-RateLimit-Limit': '5000',
  'X-RateLimit-Remaining': String(remaining),
  'X-RateLimit-Reset': String(reset),
  'X-RateLimit-Resource': resource,
});

it('knows nothing of a budget until a reply says what is left', async () => {
  const github = service();

  github.answer(reply(200));
  await github.fetch(hopOf('/a'));

  expect(github.budgetLeft()).toBeUndefined();
});

it('says what share of the rate limit the last reply left', async () => {
  const github = service();

  github.answer(reply(200, limits(1000)));
  await github.fetch(hopOf('/a'));

  expect(github.budgetLeft()).toBe(0.2);
});

it('says the smallest share left across the limits the Plugin spends', async () => {
  const github = service();

  github.answer(reply(200, limits(4000, 'core')));
  await github.fetch(hopOf('/a'));
  github.answer(reply(200, limits(250, 'graphql')));
  await github.fetch(hopOf('/graphql', undefined, 'POST'));

  expect(github.budgetLeft()).toBe(0.05);
});

it('forgets a share once its limit has reset', async () => {
  const github = service();

  github.answer(reply(200, limits(100)));
  await github.fetch(hopOf('/a'));
  github.clock.advance(3_600_000);

  expect(github.budgetLeft()).toBeUndefined();
});

it('counts a 304 that says what is left', async () => {
  const github = service();

  github.answer(reply(200, { etag: '"a"', ...limits(3000) }));
  await github.fetch(hopOf('/a'));
  github.answer(reply(304, limits(400)));
  await github.fetch(hopOf('/a'));

  expect(github.budgetLeft()).toBe(0.08);
});
