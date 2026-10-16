import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authRequired,
  type EmptySessionHarness,
  emptySessionHarness,
  failure,
  launchFailureMessage,
  local,
  prompt,
  settle,
  worktree,
} from '../../../../mocks/sessions/empty-session-store.mocks';

let h: EmptySessionHarness;

beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});

afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

const failCreate = async (): Promise<void> => {
  h.choose(worktree);
  h.store.send(prompt);
  h.calls.open[0]?.call.reject(failure);
  await settle();
};

describe('A Local open that needs sign-in', () => {
  it('says so, for the sign-in callout', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(authRequired);
    await settle();

    expect(h.store.getState().attempt).toEqual({
      status: 'failed',
      error: { type: 'auth-required' },
    });
  });
});

describe('Retry after a failed Local open', () => {
  it('opens again and keeps the failure while the open runs', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.retry();
    await settle();

    expect(h.calls.open).toHaveLength(2);
    expect(h.sendDraft).not.toHaveBeenCalled();
    expect(h.store.getState().attempt).toEqual({
      status: 'retrying',
      error: { type: 'failed', message: launchFailureMessage },
    });
  });

  it('clears the failure once the Session opens', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.retry();
    await h.openLocal('session-1');

    expect(h.store.getState().attempt).toEqual({ status: 'idle' });
  });

  // As before the attempt became one value: a second Retry finds no failed open, so the failure shows again with its Retry.
  it('shows the failure again when a second Retry finds nothing to open', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.retry();
    h.retry();
    await settle();

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState().attempt).toEqual({
      status: 'failed',
      error: { type: 'failed', message: launchFailureMessage },
    });
  });

  it('shows the new failure when the open fails again', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.retry();
    h.calls.open[1]?.call.reject(authRequired);
    await settle();

    expect(h.store.getState().attempt).toEqual({
      status: 'failed',
      error: { type: 'auth-required' },
    });
  });
});

describe('The Connection reopening after a failed Local open', () => {
  it('opens again', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.reconnect();
    await settle();

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState().attempt).toEqual({
      status: 'retrying',
      error: { type: 'failed', message: launchFailureMessage },
    });
  });
});

describe('A New worktree that failed to open', () => {
  it('keeps the failure while a second Send creates it again', async () => {
    await failCreate();

    h.store.send(prompt);

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState().attempt).toEqual({
      status: 'retrying',
      error: { type: 'failed', message: launchFailureMessage },
    });
  });

  it('sends the current draft again on Retry', async () => {
    await failCreate();

    h.retry();

    expect(h.sendDraft).toHaveBeenCalledOnce();
  });

  // Only a Send creates a New worktree, so the Connection reopening sends nothing and leaves Retry on show.
  it('keeps the failed attempt when the Connection reopens, with nothing to open', async () => {
    await failCreate();

    h.reconnect();
    await settle();

    expect(h.calls.open).toHaveLength(1);
    expect(h.sendDraft).not.toHaveBeenCalled();
    expect(h.store.getState().attempt).toEqual({
      status: 'failed',
      error: { type: 'failed', message: launchFailureMessage },
    });
  });
});
