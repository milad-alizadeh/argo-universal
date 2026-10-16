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

type CalloutSources = Pick<NewSessionWiring, 'data' | 'sessionOpening'>;

/*
 * New Session's sign-in and launch callouts. Retry, or a finished sign-in, opens again:
 * a Local checkout reopens its Empty Session, and a New worktree sends the current draft again.
 */
export function useNewSessionCallout(sources: CalloutSources): SessionCallouts {
  const problem = openProblem(sources.sessionOpening.session);
  const { openAgain } = sources.sessionOpening;

  const auth = useSessionAuth({
    subject: authSubject(sources.data),
    active: signsIn(problem),
    onSignedIn: openAgain,
  });

  return {
    callout:
      problem && openCallout(problem, { signIn: auth.callout, openAgain }),
    signInTerminal: auth.terminal,
  };
}
