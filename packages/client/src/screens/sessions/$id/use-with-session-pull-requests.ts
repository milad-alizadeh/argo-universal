import { setStringAsync } from 'expo-clipboard';
import type { useSessionFeed } from '#features/feed';
import {
  type ChangesContext,
  sayOperationFailed,
  useFireOperation,
  useSessionPullRequests,
  withRowActions,
} from '#features/plugins';
import type { SessionPullRequest } from '#features/sessions';
import type { SessionDetailViewProps } from './session-detail-view';
import { projectIdOf, useSessionSlotContext } from './use-session-slot-context';
import { withSessionPullRequests } from './with-session-pull-requests';

type SessionFeed = ReturnType<typeof useSessionFeed>;

// The Plugins' Changes with what their … menus do in this Session: copy the link, detach.
function useRowActions(
  context: ChangesContext | undefined,
  pullRequests: SessionPullRequest[],
): SessionPullRequest[] {
  const fire = useFireOperation();

  return context
    ? withRowActions(pullRequests, {
        scope: context,
        fire,
        failed: sayOperationFailed,
        copy: setStringAsync,
      })
    : pullRequests;
}

// An open Session with the Changes the Plugins supply, which its Workbench draws.
export function useWithSessionPullRequests(
  sessionId: string,
  feed: SessionFeed,
  props: SessionDetailViewProps,
): SessionDetailViewProps {
  const context = useSessionSlotContext(sessionId, projectIdOf(feed));

  return withSessionPullRequests(
    props,
    useRowActions(context, useSessionPullRequests(context)),
  );
}
