import type { SessionSnapshot } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { useAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import type { useSessionFeed } from '#features/feed';
import {
  type OpenAttempt,
  type SessionAuthSubject,
  type SessionCalloutProps,
  type SessionProblem,
  sessionProblem,
  signInCallout,
  type TerminalSignInProps,
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

export interface SessionCallouts {
  callout?: SessionCalloutProps;
  signInTerminal?: TerminalSignInProps;
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

const refusedForSignIn = (problem: SessionProblem | undefined): boolean =>
  problem?.type === 'open' && problem.error.type === 'auth-required';

const turnSigningIn = (
  problem: SessionProblem | undefined,
  authenticating: string | undefined,
): boolean => problem?.type === 'turn' && problem.id === authenticating;

// The sign-in a problem asks for: a refused open, or the `auth_required` Turn whose Authenticate was pressed.
const signsIn = (
  problem: SessionProblem | undefined,
  authenticating: string | undefined,
): boolean =>
  refusedForSignIn(problem) || turnSigningIn(problem, authenticating);

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
  const [authenticating, setAuthenticating] = useState<string>();

  const auth = useSessionAuth({
    subject: authSubject(sources.feed.snapshot, sources.agents),
    active: signsIn(open.problem, authenticating),
    onSignedIn: afterSignIn(open, () => setAuthenticating(undefined)),
  });

  const actions = { auth: auth.callout, authenticating, setAuthenticating };
  const callout = open.problem && calloutOf(open.problem, open, actions);

  return { callout, signInTerminal: auth.terminal };
}

interface CalloutActions {
  auth: ReturnType<typeof useSessionAuth>['callout'];
  authenticating: string | undefined;
  setAuthenticating: (turnEnd: string) => void;
}

type Problem<Type extends SessionProblem['type']> = Extract<
  SessionProblem,
  { type: Type }
>;

const openCallout = (
  { error }: Problem<'open'>,
  open: OpenProblem,
  actions: CalloutActions,
): SessionCalloutProps =>
  error.type === 'failed'
    ? { kind: 'launch', message: error.message, onRetry: open.openAgain }
    : signInCallout(actions.auth);

// Authenticate on an `auth_required` Turn's card swaps the card for the sign-in.
const turnCallout = (
  problem: Problem<'turn'>,
  actions: CalloutActions,
): SessionCalloutProps =>
  problem.id === actions.authenticating
    ? signInCallout(actions.auth)
    : {
        kind: 'auth-required',
        description: problem.description,
        onAuthenticate: () => actions.setAuthenticating(problem.id),
      };

function calloutOf(
  problem: SessionProblem,
  open: OpenProblem,
  actions: CalloutActions,
): SessionCalloutProps {
  if (problem.type === 'retrying') return { kind: 'loading' };

  return problem.type === 'open'
    ? openCallout(problem, open, actions)
    : turnCallout(problem, actions);
}
