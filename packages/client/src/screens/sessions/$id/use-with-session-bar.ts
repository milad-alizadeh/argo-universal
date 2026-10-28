import type { useSessionFeed } from '#features/feed';
import {
  type SessionContext,
  useSessionBar,
} from '../../plugins/use-session-bar';
import type { SessionDetailViewProps } from './session-detail-view';

type SessionFeed = ReturnType<typeof useSessionFeed>;

// The Session the Plugins' bar answers for, once its Project is known.
const barContext = (
  sessionId: string,
  { snapshot }: SessionFeed,
): SessionContext | undefined =>
  snapshot ? { sessionId, projectId: snapshot.projectId } : undefined;

// An open Session with the Plugins' bar under its header, when any Plugin left on sends a line.
export function useWithSessionBar(
  sessionId: string,
  feed: SessionFeed,
  props: SessionDetailViewProps,
): SessionDetailViewProps {
  const bar = useSessionBar(barContext(sessionId, feed));

  return props.state === 'open' && bar ? { ...props, bar } : props;
}
