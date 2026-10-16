import type { SessionOpenError } from '@repo/contracts';
import {
  type SessionAuthSubject,
  type SessionCalloutProps,
  signInCallout,
  type TerminalSignInProps,
  useSessionAuth,
} from '#features/sessions';
import type { NewSessionWiring } from './new-session-wiring';
import type { NewSessionData } from './use-new-session-data';
import type { SessionOpening } from './use-session-opening';

export interface NewSessionCallout {
  callout?: SessionCalloutProps;
  signInTerminal?: TerminalSignInProps;
}

const authSubject = ({
  choices,
}: NewSessionData): SessionAuthSubject | undefined =>
  choices.agent && choices.project
    ? {
        agent: choices.agent.agent,
        projectId: choices.project.id,
        agentName: choices.agent.label,
      }
    : undefined;

type CalloutSources = Pick<
  NewSessionWiring,
  'data' | 'attachmentDraft' | 'sessionOpening'
>;

type OpenState = Pick<SessionOpening['session'], 'error' | 'retrying'>;

const reopener =
  ({ data, attachmentDraft, sessionOpening }: CalloutSources) =>
  (): void => {
    if (data.choices.inNewWorktree)
      void sessionOpening.sendFirstPrompt(attachmentDraft.draft);
    else sessionOpening.session.store.retry();
  };

const signsIn = ({ error, retrying }: OpenState): boolean =>
  error?.type === 'auth-required' && !retrying;

/*
 * New Session's sign-in and launch callouts. Retry, or a finished sign-in, opens again:
 * a Local checkout reopens its Empty Session, and a New worktree sends the returned prompt again.
 */
export function useNewSessionCallout(
  sources: CalloutSources,
): NewSessionCallout {
  const { session } = sources.sessionOpening;
  const openAgain = reopener(sources);

  const auth = useSessionAuth({
    subject: authSubject(sources.data),
    active: signsIn(session),
    onSignedIn: openAgain,
  });

  return {
    callout: calloutOf(session, auth.callout, openAgain),
    signInTerminal: auth.terminal,
  };
}

type AuthCallout = ReturnType<typeof useSessionAuth>['callout'];

// A retried open shows Loading…; a refused one, sign-in or Failed to Launch.
function calloutOf(
  session: OpenState,
  auth: AuthCallout,
  openAgain: () => void,
): SessionCalloutProps | undefined {
  if (session.retrying) return { kind: 'loading' };

  return session.error && errorCallout(session.error, auth, openAgain);
}

const errorCallout = (
  error: SessionOpenError,
  auth: AuthCallout,
  openAgain: () => void,
): SessionCalloutProps =>
  error.type === 'failed'
    ? { kind: 'launch', message: error.message, onRetry: openAgain }
    : signInCallout(auth);
