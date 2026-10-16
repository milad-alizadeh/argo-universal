import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type EmptySessionHarness,
  emptySessionHarness,
  local,
  prompt,
  settle,
  worktree,
} from '../../../../mocks/sessions/empty-session-store.mocks';
import {
  dropped,
  serverError,
} from '../../../../mocks/sessions/open-failure.mocks';

let h: EmptySessionHarness;

beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});

afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

describe('A Local open the Connection dropped', () => {
  it('is no launch failure: a toast says why', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(dropped);
    await settle();

    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      connectionError: dropped,
    });
  });

  it('opens again when the Connection reopens', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(dropped);
    await settle();

    h.reconnect();
    await h.openLocal('session-1');

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      connectionError: undefined,
    });
  });
});

// Only a dropped Connection goes to the toast: the first prompt keeps Retry for any other failure.
describe('A Local open the Server failed with no open failure', () => {
  it('fails to launch, with Retry', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(serverError);
    await settle();

    expect(h.store.getState()).toMatchObject({
      attempt: {
        status: 'failed',
        error: { type: 'failed', message: serverError.message },
      },
      connectionError: undefined,
    });
  });

  it('delivers a prompt sent meanwhile once Retry opens it', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(serverError);
    await settle();
    h.store.send(prompt);

    h.retry();
    await h.openLocal('session-1');

    expect(h.calls.prompt.map(({ input }) => input)).toEqual(['session-1']);
  });
});

describe('A New worktree create the Connection dropped', () => {
  it('drops a toast’s failure once Send creates it again', async () => {
    h.choose(worktree);
    h.store.send(prompt);
    h.calls.open[0]?.call.reject(dropped);
    await settle();
    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      connectionError: dropped,
      pendingPrompt: false,
    });

    h.store.send(prompt);

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      connectionError: undefined,
    });
  });
});
