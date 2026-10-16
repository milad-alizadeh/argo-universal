import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  choiceDebounceMs,
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

describe('New worktree checkout', () => {
  it('opens nothing before Send', async () => {
    h.choose(worktree);
    await vi.advanceTimersByTimeAsync(choiceDebounceMs);

    expect(h.calls.open).toEqual([]);
    expect(h.store.getState().opening).toBe(false);
  });

  it('creates one Session at Send with the chosen options and the prompt', () => {
    h.choose(worktree);
    const initial = [{ configId: 'model', value: 'small' }];
    h.store.configure({ saved: {}, picks: {}, initial });

    h.store.send(prompt);

    expect(h.calls.open.map(({ input }) => input)).toEqual([
      { ...worktree, configOptions: initial, prompt },
    ]);
    expect(h.store.getState().attempt).toEqual({ status: 'idle' });
  });

  it('puts the prompt back when the Session fails to open', async () => {
    h.choose(worktree);
    h.store.send(prompt);

    h.calls.open[0]?.call.reject(failure);
    await settle();

    expect(h.store.getState()).toMatchObject({
      pendingPrompt: false,
      attempt: {
        status: 'failed',
        error: { type: 'failed', message: launchFailureMessage },
      },
      handedOff: false,
    });
    expect(h.calls.clearDraft).toBe(0);
  });

  it('closes the Local Empty Session when New worktree is chosen', async () => {
    h.choose(local('agent-one'));
    await h.openLocal('session-1');

    h.choose(worktree);
    await settle();

    expect(h.calls.close).toEqual(['session-1']);
    expect(h.calls.open).toHaveLength(1);
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
