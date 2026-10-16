import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  choiceDebounceMs,
  type EmptySessionHarness,
  emptySessionHarness,
  local,
  settle,
  prompt,
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

describe('Local checkout', () => {
  it('opens the Empty Session at once', () => {
    h.choose(local('agent-one'));

    expect(h.calls.open.map(({ input }) => input)).toEqual([
      local('agent-one'),
    ]);
    expect(h.store.getState().opening).toBe(true);
  });

  it('closes the Empty Session and opens another once an Agent change settles', async () => {
    h.choose(local('agent-one'));
    await h.openLocal('session-1');

    h.choose(local('agent-two'));
    vi.advanceTimersByTime(choiceDebounceMs - 1);
    expect(h.calls.close).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);

    expect(h.calls.close).toEqual(['session-1']);
    expect(h.calls.open.map(({ input }) => input.agent)).toEqual([
      'agent-one',
      'agent-two',
    ]);
  });

  it('closes a Session opened for an Agent since changed once it opens', async () => {
    h.choose(local('agent-one'));
    h.choose(local('agent-two'));
    await vi.advanceTimersByTimeAsync(choiceDebounceMs);

    await h.openLocal('session-1');

    expect(h.calls.close).toEqual(['session-1']);
    expect(h.calls.open.map(({ input }) => input.agent)).toEqual([
      'agent-one',
      'agent-two',
    ]);
  });
});

describe('Unsettled choices', () => {
  it('keep the Empty Session until they settle again', async () => {
    h.choose(local('agent-one'));
    await h.openLocal('session-1');

    h.choose();
    await vi.advanceTimersByTimeAsync(choiceDebounceMs);
    h.choose(local('agent-one'));
    await settle();

    expect(h.calls.close).toEqual([]);
    expect(h.calls.open).toHaveLength(1);
  });
});

describe('Agent change', () => {
  it('holds a Send made while the change settles for the new Session', async () => {
    h.choose(local('agent-one'));
    await h.openLocal('session-1');

    h.choose(local('agent-two'));
    h.store.send(prompt);
    await vi.advanceTimersByTimeAsync(choiceDebounceMs);
    await h.openLocal('session-2');

    expect(h.calls.prompt.map(({ input }) => input)).toEqual(['session-2']);
  });
});
