import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authRequired,
  type EmptySessionHarness,
  emptySessionHarness,
  failure,
  local,
  prompt,
  settle,
  worktree,
} from './empty-session-store.mocks';

let h: EmptySessionHarness;

beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});

afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

describe('A Local open that needs sign-in', () => {
  it('says so, for the sign-in callout', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(authRequired);
    await settle();

    expect(h.store.getState()).toMatchObject({
      error: { type: 'auth-required' },
      retrying: false,
    });
  });
});

describe('Retry after a failed Local open', () => {
  it('keeps the failure while the open runs again', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.store.retry();
    await settle();

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState()).toMatchObject({
      error: { type: 'failed', message: failure.message },
      retrying: true,
    });
  });

  it('clears the failure once the Session opens', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.store.retry();
    await h.openLocal('session-1');

    expect(h.store.getState()).toMatchObject({
      error: undefined,
      retrying: false,
    });
  });

  it('shows the new failure when the open fails again', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.store.retry();
    h.calls.open[1]?.call.reject(authRequired);
    await settle();

    expect(h.store.getState()).toMatchObject({
      error: { type: 'auth-required' },
      retrying: false,
    });
  });
});

describe('Sending a New worktree again after it failed to open', () => {
  it('keeps the failure while the Session is created again', async () => {
    h.choose(worktree);
    h.store.send(prompt);
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.store.send(prompt);

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState()).toMatchObject({
      error: { type: 'failed', message: failure.message },
      retrying: true,
    });
  });
});
