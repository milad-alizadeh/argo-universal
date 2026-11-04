import { expect, it, onTestFinished, vi } from 'vitest';
import { cacheOverMemory, issues, onScreen } from './page-addresses-fixtures';
import { isLive } from './page-answer';

const stopped = { kind: 'failed', error: 'Plugin stopped' } as const;

it('backs off between tries of a live page that keeps failing, so it does not loop at network speed', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  onTestFinished(() => {
    vi.useRealTimers();
  });

  const cache = cacheOverMemory();

  cache.server.pacing = { live: true };

  const screen = onScreen(cache, issues);

  await vi.advanceTimersByTimeAsync(0);

  // A page shown while it is live subscribes; its Loader fails after the first frame, and it is drawn again.
  for (let tick = 0; tick < 120_000; tick += 100) {
    if (isLive(screen.answer())) {
      cache.addresses.followLive(issues, () => null);
      cache.live.send(stopped);
    }

    await vi.advanceTimersByTimeAsync(100);
  }

  // Drawn again at once, then after 1, 2, 4, 8, 16 and 30 seconds, and every 30 after: a handful in two minutes.
  expect(cache.server.requests.length).toBeGreaterThan(5);
  expect(cache.server.requests.length).toBeLessThan(15);
  screen.leave();
});
