import type { SessionSnapshot } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import type { useAgents } from '#features/agents';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import type { useSessionFeed } from '#features/feed';
import {
  type OpenAttempt,
  type PastSessionAnswers,
  type PastSessionSignIn,
  pastSessionCallout,
  pastSessionDropToast,
  pastSessionSignIn,
  runAfterSignIn,
  type SessionAuthSubject,
  type SessionCalloutProps,
  type SessionCallouts,
  type SessionProblem,
  type SessionProblemSources,
  sessionProblem,
  type SignInEffects,
  type TurnSignInRecord,
  useConnectionDropped,
  useSessionAuth,
  useTurnSignIn,
} from '#features/sessions';
import { useErrorToast } from '#primitives/overlays/toast';
import type { SessionCommands } from './use-session-commands';

type SessionFeed = ReturnType<typeof useSessionFeed>;

type Agents = ReturnType<typeof useAgents>;

export interface SessionCalloutSources {
  sessionId: string;
  feed: SessionFeed;
  // The Connection dropped the Feed's open, so a toast says why instead of a callout.
  feedDropped: boolean;
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

interface SessionSignIn {
  signIn: PastSessionSignIn;
  turn: TurnSignInRecord;
  effects: SignInEffects;
}

interface RetriableProblem {
  problem: SessionProblem | undefined;
  openAgain: () => void;
}

// A Retry the Connection dropped never opened the Session: it runs again when the Connection reopens.
function useRetryOnReconnect(
  { retryDropped }: SessionProblemSources,
  openAgain: () => void,
): void {
  useResubscribeOnReconnect({
    status: retryDropped ? 'error' : 'idle',
    reset: openAgain,
  });
}

// What the Session's open or last Turn asks for; an open the Connection dropped shows one toast instead.
function useOpenProblem(sources: SessionCalloutSources): RetriableProblem {
  const { sessionId, feed, commands } = sources;
  const { attempt, openAgain } = useRetry(sessionId, feed);

  const problemSources: SessionProblemSources = {
    feedOpenError: feed.openError,
    feedDropped: sources.feedDropped,
    retry: attempt,
    retryDropped: useConnectionDropped(attempt.error),
    commands: [commands.promptSession, commands.setConfigOption],
    items: feed.view?.items,
  };

  useErrorToast(pastSessionDropToast(problemSources, feed.snapshot !== null));
  useRetryOnReconnect(problemSources, openAgain);

  return { problem: sessionProblem(problemSources), openAgain };
}

// The sign-in rule over that problem, with the Turn's sign-in kept across remounts.
function useSessionSignIn(sources: SessionCalloutSources): SessionSignIn {
  const { problem, openAgain } = useOpenProblem(sources);
  const turn = useTurnSignIn(sources.sessionId);
  const { answered, authenticating, finish } = turn;
  const signIn = pastSessionSignIn({ problem, answered, authenticating });

  return { signIn, turn, effects: { openAgain, finish } };
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
    onSignedIn: () => runAfterSignIn(signIn.afterSignIn, effects),
  });

  return {
    callout: pastSessionCallout(signIn, answersOf(auth.callout, sessionSignIn)),
    signInTerminal: auth.terminal,
  };
}
