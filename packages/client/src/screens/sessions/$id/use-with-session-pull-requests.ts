import { useMemo } from 'react';
import type { useSessionFeed } from '#features/feed';
import { useChangeAssociations } from '../../plugins/use-change-associations';
import { useChangeFiles } from '../../plugins/use-change-files';
import {
  type ChangesContext,
  useSessionPullRequests,
} from '../../plugins/use-session-pull-requests';
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

// An open Session with the Changes the Plugins supply, which its Workbench and Inspector draw.
export function useWithSessionPullRequests(
  sessionId: string,
  feed: SessionFeed,
  props: SessionDetailViewProps,
): SessionDetailViewProps {
  const context = useChangesContext(sessionId, feed);

  return withSessionPullRequests(props, useSessionPullRequests(context), {
    changeActions: useChangeAssociations(context),
    changeFiles: useChangeFiles(context),
  });
}
