import {
  openCallout,
  openProblem,
  type SessionAuthSubject,
  type SessionCallouts,
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

// Before Send, sign-in and Retry repeat discovery only. After Send, they retry its pending opening.
export function useNewSessionCallout(sources: CalloutSources): SessionCallouts {
  const sentProblem = openProblem(sources.sessionOpening.session);
  const discovery = sources.discovery;
  const problem =
    sentProblem ??
    (discovery?.error
      ? { type: 'open' as const, error: discovery.error }
      : undefined);
  const openAgain = sentProblem
    ? sources.sessionOpening.openAgain
    : () => discovery?.retry();

  const auth = useSessionAuth({
    subject: authSubject(sources.data),
    active: signsIn(problem),
    onSignedIn: openAgain,
  });

  return {
    callout: problem
      ? openCallout(problem, { signIn: auth.callout, openAgain })
      : discovery?.loading
        ? {
            kind: 'loading',
            title:
              discovery.stage === 'installing'
                ? 'Installing…'
                : 'Loading configuration…',
            progress:
              discovery.stage === 'installing'
                ? (discovery.progress ?? null)
                : undefined,
          }
        : undefined,
    signInTerminal: auth.terminal,
  };
}
