import { useMemo } from 'react';
import type { useSessionFeed } from '#features/feed';
import type { SessionContext } from '#features/plugins';

type SessionFeed = ReturnType<typeof useSessionFeed>;

// The Project of the Session a feed shows, once it has loaded.
export const projectIdOf = ({ snapshot }: SessionFeed): string | undefined =>
  snapshot?.projectId;

// The Session the Session Slots answer for; none until its Project is known.
export const sessionSlotContext = (
  sessionId: string,
  projectId: string | undefined,
): SessionContext | undefined =>
  projectId ? { sessionId, projectId } : undefined;

// The same Session's context as one object until either id changes.
export function useSessionSlotContext(
  sessionId: string,
  projectId: string | undefined,
): SessionContext | undefined {
  return useMemo(
    () => sessionSlotContext(sessionId, projectId),
    [sessionId, projectId],
  );
}
