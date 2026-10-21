import type { SessionSnapshot } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { type InstalledAgents, loadedAgents } from '#features/agents';
import { useResubscribeOnReconnect } from '#features/connection';
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
import type { SessionCommands } from './use-session-commands';
import type { useSessionReadOptions } from './use-session-read-options';
import { useSessionRetry } from './use-session-retry';

type SessionFeed = ReturnType<typeof useSessionFeed>;

export interface SessionCalloutSources {
  sessionId: string;
  feed: SessionFeed;
  // The Connection dropped the Feed's open, so a toast says why instead of a callout.
  feedDropped: boolean;
  commands: Pick<SessionCommands, 'promptSession' | 'setConfigOption'>;
  agents: InstalledAgents;
  discovery: Pick<ReturnType<typeof useSessionReadOptions>, 'error' | 'retry'>;
}

const agentName = (
  snapshot: SessionSnapshot,
  agents: InstalledAgents,
): string =>
  loadedAgents(agents).find((entry) => entry.id === snapshot.agent)?.name ??
  snapshot.agent;

const authSubject = (
  snapshot: SessionSnapshot | null,
  agents: InstalledAgents,
): SessionAuthSubject | undefined =>
  snapshot
    ? {
        agent: snapshot.agent,
        projectId: snapshot.projectId,
        agentName: agentName(snapshot, agents),
      }
    : undefined;

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

const isArchived = ({ snapshot }: SessionFeed): boolean =>
  snapshot !== null && snapshot.archivedAt !== null;

// An archived Session reads only, so neither its open nor its last Turn asks for anything.
const shownProblem = (
  feed: SessionFeed,
  sources: SessionProblemSources,
): SessionProblem | undefined =>
  isArchived(feed) ? undefined : sessionProblem(sources);

// What the Session's open or last Turn asks for; an open the Connection dropped shows one toast instead.
function useOpenProblem(sources: SessionCalloutSources): RetriableProblem {
  const { sessionId, feed } = sources;
  const { attempt, openAgain } = useSessionRetry(sessionId, feed);
  const problemSources = useProblemSources(sources, attempt);

  useErrorToast(pastSessionDropToast(problemSources, feed.snapshot !== null));
  useRetryOnReconnect(problemSources, openAgain);
  const current = { problem: shownProblem(feed, problemSources), openAgain };

  return isArchived(feed)
    ? current
    : discoveryFallback(current, sources.discovery);
}

function useProblemSources(
  { feed, feedDropped, commands }: SessionCalloutSources,
  attempt: OpenAttempt,
): SessionProblemSources {
  return {
    feedOpenError: feed.openError,
    feedDropped,
    retry: attempt,
    retryDropped: useConnectionDropped(attempt.error),
    commands: [commands.promptSession, commands.setConfigOption],
    items: feed.view?.items,
  };
}

// Discovery retries only configuration; it must not resume the browsed Session.
const discoveryFallback = (
  current: RetriableProblem,
  discovery: SessionCalloutSources['discovery'],
): RetriableProblem =>
  current.problem || !discovery.error
    ? current
    : {
        problem: { type: 'open', error: discovery.error },
        openAgain: discovery.retry,
      };

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
