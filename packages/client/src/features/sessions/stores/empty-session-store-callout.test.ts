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

// Only a dropped Connection goes to the toast: the first prompt keeps Retry for any other failure.
describe('A Local open the Server failed with no open failure', () => {
  it.each([
    { case: 'a Server error', cause: serverError },
    { case: 'no answer while the Connection is up', cause: dropped },
  ])('fails to launch, with Retry, on $case', async ({ cause }) => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(cause);
    await settle();

    expect(h.store.getState()).toMatchObject({
      attempt: {
        status: 'failed',
        error: { type: 'failed', message: cause.message },
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
