import type { SessionSnapshot } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { useAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import type { useSessionFeed } from '#features/feed';
import {
  type AfterSignIn,
  type OpenAttempt,
  type PastSessionAnswers,
  type PastSessionSignIn,
  pastSessionCallout,
  pastSessionSignIn,
  type SessionAuthSubject,
  type SessionCalloutProps,
  type SessionCallouts,
  type SessionProblem,
  sessionProblem,
  useAnsweredTurn,
  useSessionAuth,
} from '#features/sessions';
import type { SessionCommands } from './use-session-commands';

type SessionFeed = ReturnType<typeof useSessionFeed>;

type Agents = ReturnType<typeof useAgents>;

export interface SessionCalloutSources {
  sessionId: string;
  feed: SessionFeed;
  commands: Pick<SessionCommands, 'promptSession' | 'setConfigOption'>;
  agents: Agents;
}

const labelOf = (agents: Agents, agent: string): string | undefined =>
  agents.data?.find((entry) => entry.agent === agent)?.label;

const agentName = (snapshot: SessionSnapshot, agents: Agents): string =>
  labelOf(agents, snapshot.agent) ?? snapshot.agent;

const authSubject = (
  snapshot: SessionSnapshot | null,
  agents: Agents,
): SessionAuthSubject | undefined =>
  snapshot
    ? {
        agent: snapshot.agent,
        projectId: snapshot.projectId,
        agentName: agentName(snapshot, agents),
      }
    : undefined;

interface Retry {
  attempt: OpenAttempt;
  openAgain: () => void;
}

// Retry opens the Session again without a Turn.
function useRetry(sessionId: string, feed: SessionFeed): Retry {
  const trpc = useTRPC();

  const retry = useMutation(
    trpc.session.open.mutationOptions({ onSuccess: () => feed.retryOpen() }),
  );

  return { attempt: retry, openAgain: () => retry.mutate({ sessionId }) };
}

interface TurnSignIn {
  // The `auth_required` Turn end whose Authenticate was pressed, until its sign-in finishes.
  authenticating: string | undefined;
  onAuthenticate: (turnEnd: string) => void;
  done: () => void;
}

function useTurnSignIn(): TurnSignIn {
  const [authenticating, onAuthenticate] = useState<string | null>(null);

  return {
    authenticating: authenticating ?? undefined,
    onAuthenticate,
    done: () => onAuthenticate(null),
  };
}

interface SignInEffects {
  answerTurn: (turnEnd: string) => void;
  openAgain: () => void;
  done: () => void;
}

// Runs what the rule says a finished sign-in does.
const runAfterSignIn =
  (afterSignIn: AfterSignIn, effects: SignInEffects) => (): void => {
    if (afterSignIn.type === 'answer-turn')
      effects.answerTurn(afterSignIn.turnEnd);
    else effects.openAgain();
    effects.done();
  };

interface SessionSignIn {
  signIn: PastSessionSignIn;
  turn: TurnSignIn;
  effects: SignInEffects;
}

interface OpenProblem {
  problem: SessionProblem | undefined;
  openAgain: () => void;
}

// What the Session's open or last Turn asks for.
function useOpenProblem(sources: SessionCalloutSources): OpenProblem {
  const { sessionId, feed, commands } = sources;
  const { attempt, openAgain } = useRetry(sessionId, feed);

  const problem = sessionProblem({
    feedOpenError: feed.openError,
    retry: attempt,
    commands: [commands.promptSession, commands.setConfigOption],
    items: feed.view?.items,
  });

  return { problem, openAgain };
}

// The sign-in rule over that problem, with the Turn a sign-in answered kept across remounts.
function useSessionSignIn(sources: SessionCalloutSources): SessionSignIn {
  const { problem, openAgain } = useOpenProblem(sources);
  const { answeredTurn, answerTurn } = useAnsweredTurn(sources.sessionId);
  const turn = useTurnSignIn();
  const { authenticating } = turn;
  const signIn = pastSessionSignIn({ problem, answeredTurn, authenticating });

  return { signIn, turn, effects: { answerTurn, openAgain, done: turn.done } };
}

const answersOf = (
  signIn: SessionCalloutProps,
  { turn, effects }: SessionSignIn,
): PastSessionAnswers => ({
  signIn,
  openAgain: effects.openAgain,
  authenticating: turn.authenticating,
  onAuthenticate: turn.onAuthenticate,
});

/*
 * A past Session's sign-in and launch callouts. Retry, or a sign-in after a refused open,
 * runs the Session's open again without a Turn; a sign-in after an `auth_required` Turn
 * only clears the card, and the user resends.
 */
export function useSessionCallout(
  sources: SessionCalloutSources,
): SessionCallouts {
  const sessionSignIn = useSessionSignIn(sources);
  const { signIn, effects } = sessionSignIn;

  const auth = useSessionAuth({
    subject: authSubject(sources.feed.snapshot, sources.agents),
    active: signIn.follows,
    onSignedIn: runAfterSignIn(signIn.afterSignIn, effects),
  });

  return {
    callout: pastSessionCallout(signIn, answersOf(auth.callout, sessionSignIn)),
    signInTerminal: auth.terminal,
  };
}
