import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { KnownServer } from './resolve-server';

const silent = () => (): void => undefined;

const known: KnownServer = { name: 'Studio', key: 'studio-key' };

// The first browse of a session is the one a Local Network prompt may still be on screen for, so it is given longer.
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

const settled = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => 'resolved',
    (cause: unknown) => cause,
  );

it('waits four seconds on the first browse, and says undetermined when nothing was heard', async () => {
  const { resolveServer } = await import('./resolve-server');
  const outcome = settled(resolveServer(known, silent));

  await vi.advanceTimersByTimeAsync(3500);
  await expect(Promise.race([outcome, 'pending'])).resolves.toBe('pending');
  await vi.advanceTimersByTimeAsync(600);

  expect(await outcome).toMatchObject({ name: 'BrowseUndeterminedError' });
});

it('waits three seconds on a later browse, and says the Server is not there', async () => {
  const { resolveServer } = await import('./resolve-server');
  await Promise.all([
    settled(resolveServer(known, silent)),
    vi.advanceTimersByTimeAsync(4100),
  ]);
  const outcome = settled(resolveServer(known, silent));

  await vi.advanceTimersByTimeAsync(3100);

  expect(await outcome).toMatchObject({ name: 'ServerNotFoundError' });
});

it('still answers with the stored address when the first browse hears nothing', async () => {
  const { resolveServer } = await import('./resolve-server');
  const withAddress = {
    ...known,
    address: { host: 'studio.local', port: 4000 },
  };
  const outcome = resolveServer(withAddress, silent);

  await vi.advanceTimersByTimeAsync(4100);

  await expect(outcome).resolves.toMatchObject({ source: 'address' });
});
