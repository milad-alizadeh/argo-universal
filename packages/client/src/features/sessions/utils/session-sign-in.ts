import type { SessionCalloutProps } from '../types/session-callout';
import type { TurnSignIn } from '../types/turn-sign-in';
import {
  type OpenAnswers,
  openCallout,
  signsIn,
  type TurnAnswers,
  turnCallout,
} from './session-callouts';
import type { SessionProblem } from './session-problem';

// What a finished sign-in does (ADR-0004): clear the `auth_required` Turn's card, or open a refused Session again.
export type AfterSignIn =
  | { type: 'answer-turn'; turnEnd: string }
  | { type: 'open-again' };

export interface PastSessionSignInSources extends TurnSignIn {
  // A running Retry, a failed open, or the last Turn when it ended `auth_required`.
  problem: SessionProblem | undefined;
}

export interface PastSessionSignIn {
  // What the callout answers: a Turn a sign-in answered asks nothing.
  problem: SessionProblem | undefined;
  // The sign-in callout is on show, so this Device reads and follows the Agent's sign-in.
  follows: boolean;
  afterSignIn: AfterSignIn;
}

const answeredTurn = (
  problem: SessionProblem | undefined,
  answered: string | undefined,
): boolean => problem?.type === 'turn' && problem.id === answered;

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
  answered,
  authenticating,
}: PastSessionSignInSources): PastSessionSignIn {
  const problem = answeredTurn(shown, answered) ? undefined : shown;

  return {
    problem,
    follows: signsIn(problem, authenticating),
    afterSignIn: afterSignInOf(problem),
  };
}

export interface SignInEffects {
  // Runs the Session's open again without a Turn.
  openAgain: () => void;
  // Ends the Turn sign-in this Session keeps, answering the Turn end when given one.
  finish: (answered?: string) => void;
}

/*
 * Runs what a finished sign-in does: a Turn's sign-in answers its card; a refused open's opens
 * the Session again. Either way the sign-in has finished, so no Turn's Authenticate stays pending.
 */
export function runAfterSignIn(
  afterSignIn: AfterSignIn,
  { openAgain, finish }: SignInEffects,
): void {
  if (afterSignIn.type === 'answer-turn') {
    finish(afterSignIn.turnEnd);

    return;
  }

  openAgain();
  finish();
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
