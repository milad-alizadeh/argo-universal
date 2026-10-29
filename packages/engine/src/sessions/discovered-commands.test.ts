import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { commandsWaitMs, DiscoveredCommands } from './discovered-commands';

const review = { name: 'review', description: 'Review changes' };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const settled = async (wait: Promise<void>): Promise<boolean> => {
  let done = false;

  void wait.then(() => {
    done = true;
  });
  await vi.advanceTimersByTimeAsync(0);

  return done;
};

it('stops waiting as soon as a list has been seen', async () => {
  const discovered = new DiscoveredCommands();
  const wait = discovered.seen(new AbortController().signal);

  await vi.advanceTimersByTimeAsync(commandsWaitMs - 1);
  expect(await settled(wait)).toBe(false);
  discovered.receive([review]);
  expect(await settled(wait)).toBe(true);
  expect(discovered.commands).toEqual([review]);
});

it('gives up after the wait and leaves the list unseen', async () => {
  const discovered = new DiscoveredCommands();
  const wait = discovered.seen(new AbortController().signal);

  await vi.advanceTimersByTimeAsync(commandsWaitMs);
  expect(await settled(wait)).toBe(true);
  expect(discovered.commands).toBeUndefined();
});

it('does not wait when a list is already in hand or the reader left', async () => {
  const known = new DiscoveredCommands();
  known.receive([]);
  expect(await settled(known.seen(new AbortController().signal))).toBe(true);

  const left = new AbortController();
  const unseen = new DiscoveredCommands();
  const wait = unseen.seen(left.signal);

  left.abort();
  expect(await settled(wait)).toBe(true);
});
