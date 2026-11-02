import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type EmptySessionHarness,
  emptySessionHarness,
  failure,
  local,
  prompt,
  settle,
  worktree,
} from '../../../../mocks/sessions/empty-session-store.mocks';
import { promptShowTimeoutMs } from './empty-session-types';

let h: EmptySessionHarness;

beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});

afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

describe.each([local('agent-one'), worktree])(
  'Leaving a Send with $checkout.type',
  (input) => {
    it('does not navigate if the reader leaves during Send, and forgets the sent draft once the Session exists', async () => {
      h.choose(input);
      h.store.send(prompt);
      h.store.stop();
      expect(h.calls.forgetSentDraft).toBe(0);
      h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
      await settle();
      await vi.advanceTimersByTimeAsync(promptShowTimeoutMs);
      expect(h.calls.handOff).toEqual([]);
      expect(h.calls.clearDraft).toBe(0);
      expect(h.calls.forgetSentDraft).toBe(1);
    });
    it('forgets the sent draft once if the reader leaves while the Feed catches up', async () => {
      h.choose(input);
      h.store.send(prompt);
      h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
      await settle();
      h.store.stop();
      h.store.stop();
      await vi.advanceTimersByTimeAsync(promptShowTimeoutMs);
      expect(h.calls.handOff).toEqual([]);
      expect(h.calls.forgetSentDraft).toBe(1);
    });
    it('keeps the draft if the reader leaves during a Send that fails', async () => {
      h.choose(input);
      h.store.send(prompt);
      h.store.stop();
      h.calls.open[0]?.call.reject(failure);
      await settle();
      expect(h.calls.clearDraft).toBe(0);
      expect(h.calls.forgetSentDraft).toBe(0);
    });
  },
);
