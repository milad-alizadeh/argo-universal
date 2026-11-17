import { setStringAsync } from 'expo-clipboard';
import { useMemo } from 'react';
import type { useSessionFeed } from '#features/feed';
import {
  type ChangesContext,
  useOperationRunner,
  useSessionPullRequests,
  withRowActions,
} from '#features/plugins';
import type { SessionPullRequest } from '#features/sessions';
import type { SessionDetailViewProps } from './session-detail-view';
import { withSessionPullRequests } from './with-session-pull-requests';

type SessionFeed = ReturnType<typeof useSessionFeed>;

// The Session the Plugins' Changes answer for, once its Project is known; one object until either changes.
function useChangesContext(
  sessionId: string,
  { snapshot }: SessionFeed,
): ChangesContext | undefined {
  const projectId = snapshot?.projectId;

  return useMemo(
    () => (projectId ? { sessionId, projectId } : undefined),
    [sessionId, projectId],
  );
}

// The Plugins' Changes with what their … menus do in this Session: copy the link, detach.
function useRowActions(
  context: ChangesContext | undefined,
  pullRequests: SessionPullRequest[],
): SessionPullRequest[] {
  const { run, failed } = useOperationRunner();

  return context
    ? withRowActions(pullRequests, {
        scope: context,
        run,
        failed,
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
  const context = useChangesContext(sessionId, feed);

  return withSessionPullRequests(
    props,
    useRowActions(context, useSessionPullRequests(context)),
  );
}
