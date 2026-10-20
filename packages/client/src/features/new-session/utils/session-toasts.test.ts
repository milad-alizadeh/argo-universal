import { describe, expect, it } from 'vitest';
import type { ErrorToast } from '#primitives/overlays/toast';
import { dropped } from '../../../../mocks/sessions/open-failure.mocks';
import type { OpenAttempt } from './session-problem';
import { droppedOpenToast, pastSessionDropToast } from './session-toasts';

const couldNotOpen: ErrorToast = {
  title: "Couldn't open the Session",
  message: 'WebSocket closed',
  key: 'connection-dropped',
};

describe('droppedOpenToast', () => {
  it.each([
    { case: 'an open that never happened', sources: { open: dropped } },
    {
      case: 'the Feed of a Session that never opened',
      sources: { feed: dropped, opened: false },
    },
  ])('says why for $case', ({ sources }) => {
    expect(droppedOpenToast(sources)).toEqual(couldNotOpen);
  });

  // The App already says it is reconnecting.
  it('shows none for the Feed of an open Session', () => {
    expect(droppedOpenToast({ feed: dropped, opened: true })).toBeUndefined();
  });

  // The toast's one key keeps a second drop, shown or not, from showing another.
  it('shows one toast when the Feed and a Retry drop together', () => {
    expect(
      droppedOpenToast({ open: dropped, feed: dropped, opened: true }),
    ).toEqual(couldNotOpen);
  });

  it('shows none with no drop', () => {
    expect(droppedOpenToast({})).toBeUndefined();
  });
});

const retry = (error: Error): OpenAttempt => ({
  submittedAt: 2,
  error,
  isPending: false,
});

const fine = {
  retry: { submittedAt: 0, error: null, isPending: false },
  retryDropped: false,
  feedOpenError: null,
  feedDropped: false,
};

describe('pastSessionDropToast', () => {
  it.each([
    {
      case: 'a Retry the Connection dropped',
      sources: { ...fine, retry: retry(dropped), retryDropped: true },
      opened: true,
    },
    {
      case: 'a Feed the Connection dropped before the Session opened',
      sources: { ...fine, feedOpenError: dropped, feedDropped: true },
      opened: false,
    },
  ])('says why for $case', ({ sources, opened }) => {
    expect(pastSessionDropToast(sources, opened)).toEqual(couldNotOpen);
  });

  it.each([
    {
      case: 'a Retry that failed with the Connection up',
      sources: { ...fine, retry: retry(dropped) },
    },
    {
      case: 'a Feed that closed with the Connection up',
      sources: { ...fine, feedOpenError: dropped },
    },
  ])('leaves $case to the callout', ({ sources }) => {
    expect(pastSessionDropToast(sources, false)).toBeUndefined();
  });
});
