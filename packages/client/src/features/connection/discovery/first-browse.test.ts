import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { type KnownServer, resolveServer } from './resolve-server';

const silent = (): (() => void) => (): void => {};

const known: KnownServer = { name: 'Studio', key: 'studio-key' };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// What a resolve ended as: the name of its error, or that it resolved.
const endedAs = (promise: Promise<unknown>): Promise<string> =>
  promise.then(
    () => 'resolved',
    (cause: Error) => cause.name,
  );

// The tests run in this order: the first browse of a session is the one that waits longer, and the module remembers that it has happened.
it('waits four seconds on the first browse, and says undetermined when nothing was heard', async () => {
  const outcome = endedAs(resolveServer(known, silent));

  await vi.advanceTimersByTimeAsync(3500);
  await expect(Promise.race([outcome, 'pending'])).resolves.toBe('pending');
  await vi.advanceTimersByTimeAsync(600);

  await expect(outcome).resolves.toBe('BrowseUndeterminedError');
});

it('waits three seconds on a later browse, and says the Server is not there', async () => {
  const outcome = endedAs(resolveServer(known, silent));

  await vi.advanceTimersByTimeAsync(3100);

  await expect(outcome).resolves.toBe('ServerNotFoundError');
});

it('still answers with the stored address when nothing is heard', async () => {
  const address = { host: 'studio.local', port: 4000 };
  const outcome = resolveServer({ ...known, address }, silent);

  await vi.advanceTimersByTimeAsync(3100);

  await expect(outcome).resolves.toMatchObject({ source: 'address' });
});
