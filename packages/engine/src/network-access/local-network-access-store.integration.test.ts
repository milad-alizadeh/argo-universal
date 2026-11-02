import { expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { writerMachine } from '../storage';
import { LocalNetworkAccess, type Rebind } from './local-network-access';

// A Writer that works, or one that has stopped so every write to it fails.
function create(storing: boolean): LocalNetworkAccess {
  const { database } = openTestDatabase();

  const writer = createActor(writerMachine, {
    input: { database, now: Date.now },
  }).start();

  if (!storing) writer.stop();

  return new LocalNetworkAccess(database, writer);
}

const binding = (): ReturnType<typeof vi.fn<Rebind>> =>
  vi.fn<Rebind>().mockResolvedValue();

it('tells subscribers the new state once it is bound and stored, and none after they unsubscribe', async (): Promise<void> => {
  const access = create(true);
  const rebind = binding();
  const listener = vi.fn<(enabled: boolean) => void>();
  access.useBinding(rebind);
  const unsubscribe = access.subscribe(listener);

  await access.set(true);
  unsubscribe();
  await access.set(false);

  expect(rebind).toHaveBeenCalledTimes(2);
  expect(listener).toHaveBeenCalledOnce();
  expect(listener).toHaveBeenCalledWith(true);
  expect(access.enabled).toBe(false);
});

it('puts the listener back and keeps the old state when the choice cannot be stored', async (): Promise<void> => {
  const access = create(false);
  const rebind = binding();
  const listener = vi.fn<(enabled: boolean) => void>();
  access.useBinding(rebind);
  access.subscribe(listener);

  await expect(access.set(true)).rejects.toThrow(
    'Database Writer is not available',
  );

  expect(rebind.mock.calls).toEqual([[true], [false]]);
  expect(access.enabled).toBe(false);
  expect(listener).not.toHaveBeenCalled();
});

it('follows where the listener really is when it cannot go back, and reports both failures', async (): Promise<void> => {
  const access = create(false);

  const rebind = vi
    .fn<Rebind>()
    .mockResolvedValueOnce()
    .mockRejectedValueOnce(new Error('cannot go back'));

  const listener = vi.fn<(enabled: boolean) => void>();
  access.useBinding(rebind);
  access.subscribe(listener);

  const failure = await access.set(true).then(
    (): Error => new Error('the change did not fail'),
    (error: Error): Error => error,
  );

  expect(failure).toBeInstanceOf(AggregateError);
  expect(failure).toHaveProperty(
    'errors.0.message',
    'Database Writer is not available',
  );
  expect(failure).toHaveProperty('errors.1.message', 'cannot go back');
  expect(failure.message).toBe(
    'Local network access is on now but could not be stored or undone; a restart returns it to off',
  );
  expect(access.enabled).toBe(true);
  expect(listener).toHaveBeenCalledWith(true);
});

it('binds again when set to the value it already has, so a listener that lost its address is repaired', async (): Promise<void> => {
  const access = create(true);
  const rebind = binding();
  const listener = vi.fn<(enabled: boolean) => void>();
  access.useBinding(rebind);
  access.subscribe(listener);

  await access.set(false);

  expect(rebind).toHaveBeenCalledExactlyOnceWith(false);
  expect(listener).not.toHaveBeenCalled();
});

it('does not fail the change or skip the other subscribers when one throws', async (): Promise<void> => {
  const access = create(true);
  const after = vi.fn<(enabled: boolean) => void>();
  vi.spyOn(console, 'error').mockImplementation((): void => {});
  access.useBinding(binding());
  access.subscribe((): void => {
    throw new Error('subscriber broke');
  });
  access.subscribe(after);

  await access.set(true);

  expect(access.enabled).toBe(true);
  expect(after).toHaveBeenCalledWith(true);
  expect(console.error).toHaveBeenCalledOnce();
});
