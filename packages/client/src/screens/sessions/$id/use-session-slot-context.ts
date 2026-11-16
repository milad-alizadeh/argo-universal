import { useMemo } from 'react';
import type { useSessionFeed } from '#features/feed';
import type { SessionContext } from '#features/plugins';

type SessionFeed = ReturnType<typeof useSessionFeed>;

// The Session the Session Slots answer for, once its Project is known; one object until either changes.
export function useSessionSlotContext(
  sessionId: string,
  { snapshot }: SessionFeed,
): SessionContext | undefined {
  const projectId = snapshot?.projectId;

  return useMemo(
    () => (projectId ? { sessionId, projectId } : undefined),
    [sessionId, projectId],
  );
}
