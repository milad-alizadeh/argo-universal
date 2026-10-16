import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type EmptySessionHarness,
  emptySessionHarness,
  local,
  prompt,
  settle,
  worktree,
} from '../../../../mocks/sessions/empty-session-store.mocks';
import { dropped } from '../../../../mocks/sessions/open-failure.mocks';

let h: EmptySessionHarness;

beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});

afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

const dropLocalOpen = async (): Promise<void> => {
  h.choose(local('agent-one'));
  h.drop();
  h.calls.open[0]?.call.reject(dropped);
  await settle();
};

const dropCreate = async (): Promise<void> => {
  h.choose(worktree);
  h.store.send(prompt);
  h.drop();
  h.calls.open[0]?.call.reject(dropped);
  await settle();
};

describe('A Local open the Connection dropped', () => {
  it('is no launch failure: a toast says why', async () => {
    await dropLocalOpen();

    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      connectionError: dropped,
    });
  });

  it('opens again when the Connection reopens', async () => {
    await dropLocalOpen();

    h.reconnect();
    await h.openLocal('session-1');

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      connectionError: undefined,
    });
  });
});

describe('A New worktree create the Connection dropped', () => {
  it('drops a toast’s failure once Send creates it again', async () => {
    await dropCreate();
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

  // Only a Send creates a New worktree, so the Connection reopening sends nothing.
  it('sends nothing when the Connection reopens', async () => {
    await dropCreate();

    h.reconnect();
    await settle();

    expect(h.calls.open).toHaveLength(1);
    expect(h.sendDraft).not.toHaveBeenCalled();
  });
});
