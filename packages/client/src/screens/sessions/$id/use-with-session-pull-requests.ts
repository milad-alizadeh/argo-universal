import type { useSessionFeed } from '#features/feed';
import { useChangeAssociations } from '../../plugins/use-change-associations';
import {
  type ChangesContext,
  useSessionPullRequests,
} from '../../plugins/use-session-pull-requests';
import type { SessionDetailViewProps } from './session-detail-view';
import { withSessionPullRequests } from './with-session-pull-requests';

type SessionFeed = ReturnType<typeof useSessionFeed>;

// The Session the Plugins' Changes answer for, once its Project is known.
const changesContext = (
  sessionId: string,
  { snapshot }: SessionFeed,
): ChangesContext | undefined =>
  snapshot ? { sessionId, projectId: snapshot.projectId } : undefined;

// An open Session with the Changes the Plugins supply, which its Workbench and Inspector draw.
export function useWithSessionPullRequests(
  sessionId: string,
  feed: SessionFeed,
  props: SessionDetailViewProps,
): SessionDetailViewProps {
  const context = changesContext(sessionId, feed);

  return withSessionPullRequests(
    props,
    useSessionPullRequests(context),
    useChangeAssociations(context),
  );
}
