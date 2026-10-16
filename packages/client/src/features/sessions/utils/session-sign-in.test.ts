import { describe, expect, it } from 'vitest';
import type { SessionCalloutProps } from '../types/session-callout';
import type { SessionProblem } from './session-problem';
import {
  type AfterSignIn,
  pastSessionCallout,
  pastSessionSignIn,
  type PastSessionSignInSources,
} from './session-sign-in';

const refused: SessionProblem = {
  type: 'open',
  error: { type: 'auth-required' },
};

const failed: SessionProblem = {
  type: 'open',
  error: { type: 'failed', message: 'Agent exited with status 1' },
};

const expired: SessionProblem = {
  type: 'turn',
  id: 'end-1',
  description: 'Your sign-in expired.',
};

const laterExpired: SessionProblem = { type: 'turn', id: 'end-2' };

const quiet: PastSessionSignInSources = {
  problem: undefined,
  answered: undefined,
  authenticating: undefined,
};

const openAgain: AfterSignIn = { type: 'open-again' };

describe('pastSessionSignIn', () => {
  it.each<{
    case: string;
    sources: Partial<PastSessionSignInSources>;
    problem: SessionProblem | undefined;
    follows: boolean;
  }>([
    {
      case: 'a refused open signs in',
      sources: { problem: refused },
      problem: refused,
      follows: true,
    },
    {
      case: 'a launch failure signs nothing in',
      sources: { problem: failed },
      problem: failed,
      follows: false,
    },
    {
      case: 'a Turn that needs sign-in waits for Authenticate',
      sources: { problem: expired },
      problem: expired,
      follows: false,
    },
    {
      case: 'a Turn whose Authenticate was pressed signs in',
      sources: { problem: expired, authenticating: 'end-1' },
      problem: expired,
      follows: true,
    },
    {
      case: 'a remounted page keeps the answered Turn cleared',
      sources: { problem: expired, answered: 'end-1' },
      problem: undefined,
      follows: false,
    },
    {
      case: 'a later Turn that needs sign-in shows its own card',
      sources: { problem: laterExpired, answered: 'end-1' },
      problem: laterExpired,
      follows: false,
    },
    {
      case: 'an answered Turn leaves a refused open on show',
      sources: { problem: refused, answered: 'end-1' },
      problem: refused,
      follows: true,
    },
  ])('$case', ({ sources, problem, follows }) => {
    expect(pastSessionSignIn({ ...quiet, ...sources })).toMatchObject({
      problem,
      follows,
    });
  });

  it.each<{
    case: string;
    sources: Partial<PastSessionSignInSources>;
    afterSignIn: AfterSignIn;
  }>([
    {
      case: 'a Turn whose Authenticate was pressed clears its card',
      sources: { problem: expired, authenticating: 'end-1' },
      afterSignIn: { type: 'answer-turn', turnEnd: 'end-1' },
    },
    {
      case: 'a refused open opens again',
      sources: { problem: refused },
      afterSignIn: openAgain,
    },
  ])('after sign-in, $case', ({ sources, afterSignIn }) => {
    expect(pastSessionSignIn({ ...quiet, ...sources }).afterSignIn).toEqual(
      afterSignIn,
    );
  });
});

// The sign-in reads Loading… until the Agent's methods arrive: a cold auth cache.
const coldSignIn: SessionCalloutProps = { kind: 'loading' };

const answers = {
  signIn: coldSignIn,
  openAgain: (): void => {},
  authenticating: undefined,
  onAuthenticate: (): void => {},
};

describe('pastSessionCallout with a cold auth cache', () => {
  it.each<{
    case: string;
    sources: Partial<PastSessionSignInSources>;
    kind: SessionCalloutProps['kind'] | undefined;
  }>([
    {
      case: 'Loading… for a refused open',
      sources: { problem: refused },
      kind: 'loading',
    },
    {
      case: 'the Turn’s card before Authenticate',
      sources: { problem: expired },
      kind: 'auth-required',
    },
    {
      case: 'nothing for a Turn a sign-in answered before the remount',
      sources: { problem: expired, answered: 'end-1' },
      kind: undefined,
    },
  ])('shows $case', ({ sources, kind }) => {
    const signIn = pastSessionSignIn({ ...quiet, ...sources });

    expect(pastSessionCallout(signIn, answers)?.kind).toBe(kind);
  });

  it('shows Loading… once a Turn’s Authenticate is pressed', () => {
    const signIn = pastSessionSignIn({
      ...quiet,
      problem: expired,
      authenticating: 'end-1',
    });

    expect(
      pastSessionCallout(signIn, { ...answers, authenticating: 'end-1' }),
    ).toBe(coldSignIn);
  });
});
