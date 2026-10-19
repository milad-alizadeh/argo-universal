import {
  openCallout,
  openProblem,
  type SessionAuthSubject,
  type SessionCallouts,
  type SessionCalloutProps,
  signsIn,
  useSessionAuth,
} from '#features/sessions';
import type { NewSessionWiring } from './new-session-wiring';
import type { NewSessionData } from './use-new-session-data';

const authSubject = ({
  choices,
}: NewSessionData): SessionAuthSubject | undefined =>
  choices.agent && choices.project
    ? {
        agent: choices.agent.id,
        projectId: choices.project.id,
        agentName: choices.agent.name,
      }
    : undefined;

type CalloutSources = Pick<
  NewSessionWiring,
  'data' | 'sessionOpening' | 'discovery'
>;

type Problem = ReturnType<typeof openProblem>;

type Discovery = NewSessionWiring['discovery'];

function discoveryProblem(discovery: Discovery): Problem {
  return discovery?.error
    ? { type: 'open', error: discovery.error }
    : undefined;
}

function loadingCallout(discovery: Discovery): SessionCalloutProps | undefined {
  if (!discovery?.loading) return undefined;

  return loadingStage(discovery);
}

function loadingStage(discovery: NonNullable<Discovery>): SessionCalloutProps {
  if (discovery.stage !== 'installing')
    return { kind: 'loading', title: 'Loading configuration…' };

  return {
    kind: 'loading',
    title: 'Installing…',
    progress: discovery.progress ?? null,
  };
}

interface Retry {
  problem: Problem;
  openAgain: () => void;
}

function retryOf(sources: CalloutSources): Retry {
  const sentProblem = openProblem(sources.sessionOpening.session);

  return {
    problem: sentProblem ?? discoveryProblem(sources.discovery),
    openAgain: sentProblem
      ? sources.sessionOpening.openAgain
      : (): void => sources.discovery?.retry(),
  };
}

// Before Send, sign-in and Retry repeat discovery only. After Send, they retry its pending opening.
export function useNewSessionCallout(sources: CalloutSources): SessionCallouts {
  const { problem, openAgain } = retryOf(sources);

  const auth = useSessionAuth({
    subject: authSubject(sources.data),
    active: signsIn(problem),
    onSignedIn: openAgain,
  });

  return {
    callout: problem
      ? openCallout(problem, { signIn: auth.callout, openAgain })
      : loadingCallout(sources.discovery),
    signInTerminal: auth.terminal,
  };
}
