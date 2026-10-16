import type { SessionSnapshot } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { useAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import type { useSessionFeed } from '#features/feed';
import {
  type OpenAnswers,
  type OpenAttempt,
  openCallout,
  type SessionAuthSubject,
  type SessionCalloutProps,
  type SessionCallouts,
  type SessionProblem,
  sessionProblem,
  signsIn,
  type TurnAnswers,
  turnCallout,
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

interface OpenProblem {
  problem: SessionProblem | undefined;
  openAgain: () => void;
  answerTurn: (turnEnd: string) => void;
}

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

// What the Session's open or last Turn asks for.
function useOpenProblem(sources: SessionCalloutSources): OpenProblem {
  const { sessionId, feed, commands } = sources;
  const [signedInAfter, answerTurn] = useState<string>();
  const { attempt, openAgain } = useRetry(sessionId, feed);

  const problem = sessionProblem({
    feedOpenError: feed.openError,
    retry: attempt,
    commands: [commands.promptSession, commands.setConfigOption],
    items: feed.view?.items,
    signedInAfter,
  });

  return { problem, answerTurn, openAgain };
}

// A sign-in after an `auth_required` Turn clears its card; after a refused open, the open runs again.
const afterSignIn =
  ({ problem, openAgain, answerTurn }: OpenProblem, done: () => void) =>
  (): void => {
    if (problem?.type === 'turn') answerTurn(problem.id);
    else openAgain();
    done();
  };

/*
 * A past Session's sign-in and launch callouts. Retry, or a sign-in after a refused open,
 * runs the Session's open again without a Turn; a sign-in after an `auth_required` Turn
 * only clears the card, and the user resends.
 */
export function useSessionCallout(
  sources: SessionCalloutSources,
): SessionCallouts {
  const open = useOpenProblem(sources);
  const turn = useTurnSignIn();

  const auth = useSessionAuth({
    subject: authSubject(sources.feed.snapshot, sources.agents),
    active: signsIn(open.problem, turn.authenticating),
    onSignedIn: afterSignIn(open, turn.done),
  });

  const answers = { ...turn, signIn: auth.callout, openAgain: open.openAgain };

  return { callout: calloutOf(open, answers), signInTerminal: auth.terminal };
}

interface TurnSignIn extends Omit<TurnAnswers, 'signIn'> {
  done: () => void;
}

// The `auth_required` Turn whose Authenticate was pressed, until its sign-in finishes.
function useTurnSignIn(): TurnSignIn {
  const [authenticating, onAuthenticate] = useState<string | null>(null);

  return {
    authenticating: authenticating ?? undefined,
    onAuthenticate,
    done: () => onAuthenticate(null),
  };
}

type CalloutAnswers = OpenAnswers & TurnAnswers;

const answerOf = (
  problem: SessionProblem,
  answers: CalloutAnswers,
): SessionCalloutProps =>
  problem.type === 'turn'
    ? turnCallout(problem, answers)
    : openCallout(problem, answers);

const calloutOf = (
  { problem }: OpenProblem,
  answers: CalloutAnswers,
): SessionCalloutProps | undefined => problem && answerOf(problem, answers);
