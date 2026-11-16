import type { useSessionFeed } from '#features/feed';
import { useSessionBar } from '#features/plugins';
import type { SessionDetailViewProps } from './session-detail-view';
import { useSessionSlotContext } from './use-session-slot-context';

type SessionFeed = ReturnType<typeof useSessionFeed>;

// An open Session with the Plugins' bar under its header, when any Plugin left on sends a line.
export function useWithSessionBar(
  sessionId: string,
  feed: SessionFeed,
  props: SessionDetailViewProps,
): SessionDetailViewProps {
  const bar = useSessionBar(useSessionSlotContext(sessionId, feed));

  return props.state === 'open' && bar ? { ...props, bar } : props;
}
