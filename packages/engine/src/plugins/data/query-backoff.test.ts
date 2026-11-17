import { expect, it, vi } from 'vitest';
import { address, pluginId, valueOf } from '#mocks/plugin-data-harness';
import { failedAfterAnswer, rateLimited } from './query-backoff-fixtures';
import { failureBackoffMs } from './query-rest';

it('serves the last good answer with the failure, and reads nothing during the backoff', async () => {
  const github = await failedAfterAnswer();
  const during = await github.read({ holder: { ...address, path: '/x' } });

  expect(github.reads()).toHaveLength(2);
  expect(during).toMatchObject({
    ok: true,
    value: { data: { count: 1 }, error: rateLimited },
  });
});

it('reads again once the backoff has passed, and doubles it after another failure', async () => {
  const github = await failedAfterAnswer();

  github.clock.advance(failureBackoffMs);
  const retry = github.read();

  await vi.waitFor(() => expect(github.reads()).toHaveLength(3));
  await github.fail(rateLimited);
  await retry;

  github.clock.advance(failureBackoffMs);
  await github.read();
  expect(github.reads()).toHaveLength(3);

  github.clock.advance(failureBackoffMs);
  const third = github.read();

  await vi.waitFor(() => expect(github.reads()).toHaveLength(4));
  await github.answer({ count: 2 });
  expect(valueOf(await third)).toEqual({ count: 2 });
});

it('starts the backoff over after an answer', async () => {
  const github = await failedAfterAnswer();

  github.clock.advance(failureBackoffMs);
  const retry = github.read();

  await github.answer({ count: 2 });
  await retry;
  github.data.written(pluginId);

  const failed = github.read({ holder: { ...address, path: '/again' } });

  await github.fail(rateLimited);
  await failed;
  github.clock.advance(failureBackoffMs);
  void github.read({ holder: { ...address, path: '/again' } });

  await vi.waitFor(() => expect(github.reads()).toHaveLength(5));
});
