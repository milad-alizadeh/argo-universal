import type { SessionOpenError } from '@repo/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { SessionCalloutProps } from '../types/session-callout';
import {
  type OpenProblem,
  openCallout,
  openProblem,
  type OpenState,
  signsIn,
  turnCallout,
} from './session-callouts';
import type { SessionProblem } from './session-problem';

const signIn: SessionCalloutProps = { kind: 'loading' };

const openAgain = (): void => {};

const exited = 'Agent exited with status 1';

const openWith = (error: SessionOpenError): OpenProblem => ({
  type: 'open',
  error,
});

const signInError: SessionOpenError = { type: 'auth-required' };

const refused = openWith(signInError);

const failed = openWith({ type: 'failed', message: exited });

const turn = {
  type: 'turn',
  id: 'turn-end-1',
  description: 'Your sign-in expired.',
} as const;

describe('openProblem', () => {
  it.each<[string, OpenState, OpenProblem | undefined]>([
    ['nothing while the open is fine', { retrying: false }, undefined],
    ['the failure', { retrying: false, error: signInError }, refused],
    [
      'a running Retry over the failure',
      { retrying: true, error: signInError },
      { type: 'retrying' },
    ],
  ])('reads %s', (_, state, problem) => {
    expect(openProblem(state)).toEqual(problem);
  });
});

describe('openCallout', () => {
  it.each<[string, OpenProblem, SessionCalloutProps]>([
    ['Loading… while Retry runs', { type: 'retrying' }, { kind: 'loading' }],
    ['the sign-in for a refused open', refused, signIn],
    [
      'Failed to Launch, whose Retry opens again',
      failed,
      { kind: 'launch', message: exited, onRetry: openAgain },
    ],
  ])('shows %s', (_, problem, callout) => {
    expect(openCallout(problem, { signIn, openAgain })).toEqual(callout);
  });
});

describe('turnCallout', () => {
  it('shows the Agent words with Authenticate on a Turn that needs sign-in', () => {
    const callout = turnCallout(turn, {
      signIn,
      authenticating: undefined,
      onAuthenticate: () => {},
    });

    expect(callout).toMatchObject({ description: turn.description });
  });

  it('answers Authenticate with the Turn end it was pressed on', () => {
    const onAuthenticate = vi.fn<(turnEnd: string) => void>();

    const callout = turnCallout(turn, {
      signIn,
      authenticating: undefined,
      onAuthenticate,
    });

    if (callout.kind === 'auth-required') callout.onAuthenticate();

    expect(onAuthenticate).toHaveBeenCalledWith(turn.id);
  });

  it('shows the sign-in once Authenticate is pressed', () => {
    expect(
      turnCallout(turn, {
        signIn,
        authenticating: turn.id,
        onAuthenticate: () => {},
      }),
    ).toBe(signIn);
  });
});

describe('signsIn', () => {
  it.each<{
    label: string;
    problem: SessionProblem | undefined;
    authenticating?: string;
    expected: boolean;
  }>([
    { label: 'a refused open', problem: refused, expected: true },
    { label: 'a launch failure', problem: failed, expected: false },
    {
      label: 'a running Retry',
      problem: { type: 'retrying' },
      expected: false,
    },
    { label: 'a Turn before Authenticate', problem: turn, expected: false },
    {
      label: 'a Turn after its Authenticate',
      problem: turn,
      authenticating: turn.id,
      expected: true,
    },
    { label: 'no problem', problem: undefined, expected: false },
  ])(
    'signs in for $label: $expected',
    ({ problem, authenticating, expected }) => {
      expect(signsIn(problem, authenticating)).toBe(expected);
    },
  );
});
