import type { OpenAttempt } from '../types/open-attempt';
import type { SessionCalloutProps } from '../types/session-callout';
import type { SessionProblem } from './session-problem';

type Problem<Type extends SessionProblem['type']> = Extract<
  SessionProblem,
  { type: Type }
>;

export type OpenProblem = Problem<'retrying' | 'open'>;

// New Session's open as a problem: a running Retry, or the failure it answers.
export const openProblem = ({
  attempt,
}: {
  attempt: OpenAttempt;
}): OpenProblem | undefined => {
  if (attempt.status === 'retrying') return { type: 'retrying' };

  return attempt.status === 'failed'
    ? { type: 'open', error: attempt.error }
    : undefined;
};

export interface OpenAnswers {
  // The sign-in callout: Loading… until the Agent's methods arrive.
  signIn: SessionCalloutProps;
  openAgain: () => void;
}

// A running Retry shows Loading…; a refused open, the sign-in or Failed to Launch.
export const openCallout = (
  problem: OpenProblem,
  { signIn, openAgain }: OpenAnswers,
): SessionCalloutProps => {
  if (problem.type === 'retrying') return { kind: 'loading' };

  return problem.error.type === 'failed'
    ? { kind: 'launch', message: problem.error.message, onRetry: openAgain }
    : signIn;
};

export interface TurnAnswers {
  signIn: SessionCalloutProps;
  // The `auth_required` Turn end whose Authenticate was pressed.
  authenticating: string | undefined;
  onAuthenticate: (turnEnd: string) => void;
}

// Authenticate on an `auth_required` Turn's card swaps the card for the sign-in.
export const turnCallout = (
  problem: Problem<'turn'>,
  answers: TurnAnswers,
): SessionCalloutProps =>
  problem.id === answers.authenticating
    ? answers.signIn
    : {
        kind: 'auth-required',
        description: problem.description,
        onAuthenticate: () => answers.onAuthenticate(problem.id),
      };

const refusedForSignIn = (problem: SessionProblem | undefined): boolean =>
  problem?.type === 'open' && problem.error.type === 'auth-required';

const turnSigningIn = (
  problem: SessionProblem | undefined,
  authenticating: string | undefined,
): boolean => problem?.type === 'turn' && problem.id === authenticating;

// The sign-in a problem asks for: a refused open, or the `auth_required` Turn whose Authenticate was pressed.
export const signsIn = (
  problem: SessionProblem | undefined,
  authenticating?: string,
): boolean =>
  refusedForSignIn(problem) || turnSigningIn(problem, authenticating);
