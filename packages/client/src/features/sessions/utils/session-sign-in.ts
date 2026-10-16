import {
  type OpenAnswers,
  openCallout,
  signsIn,
  type TurnAnswers,
  turnCallout,
} from '../state/session-callouts';
import type { SessionProblem } from '../state/session-problem';
import type { SessionCalloutProps } from '../types/session-callout';

// What a finished sign-in does (ADR-0004): clear the `auth_required` Turn's card, or open a refused Session again.
export type AfterSignIn =
  | { type: 'answer-turn'; turnEnd: string }
  | { type: 'open-again' };

export interface PastSessionSignInSources {
  // A running Retry, a failed open, or the last Turn when it ended `auth_required`.
  problem: SessionProblem | undefined;
  // The `auth_required` Turn end a sign-in has answered, kept per Session.
  answeredTurn: string | undefined;
  // The `auth_required` Turn end whose Authenticate was pressed.
  authenticating: string | undefined;
}

export interface PastSessionSignIn {
  // What the callout answers: a Turn a sign-in answered asks nothing.
  problem: SessionProblem | undefined;
  // The sign-in callout is on show, so this Device reads and follows the Agent's sign-in.
  follows: boolean;
  afterSignIn: AfterSignIn;
}

const answered = (
  problem: SessionProblem | undefined,
  answeredTurn: string | undefined,
): boolean => problem?.type === 'turn' && problem.id === answeredTurn;

const afterSignInOf = (problem: SessionProblem | undefined): AfterSignIn =>
  problem?.type === 'turn'
    ? { type: 'answer-turn', turnEnd: problem.id }
    : { type: 'open-again' };

/*
 * A past Session's sign-in. A sign-in after a Turn ended `auth_required` clears that Turn's
 * card, and the user resends; a sign-in after a refused open opens the Session again.
 */
export function pastSessionSignIn({
  problem: shown,
  answeredTurn,
  authenticating,
}: PastSessionSignInSources): PastSessionSignIn {
  const problem = answered(shown, answeredTurn) ? undefined : shown;

  return {
    problem,
    follows: signsIn(problem, authenticating),
    afterSignIn: afterSignInOf(problem),
  };
}

export type PastSessionAnswers = OpenAnswers & TurnAnswers;

// The callout above the Composer: the Turn's card or its sign-in, or the open's sign-in or Failed to Launch.
export const pastSessionCallout = (
  { problem }: PastSessionSignIn,
  answers: PastSessionAnswers,
): SessionCalloutProps | undefined => {
  if (!problem) return undefined;

  return problem.type === 'turn'
    ? turnCallout(problem, answers)
    : openCallout(problem, answers);
};
