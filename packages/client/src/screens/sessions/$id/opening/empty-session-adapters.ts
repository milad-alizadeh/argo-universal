import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useConnection, useTRPCClient } from '#features/connection';
import type { EmptySessionPorts } from '#features/sessions';

// The store keeps its ports; Composer supplies the current Project draft operation.
function useCurrentDraftClear(clearDraft: () => void): () => void {
  const current = useRef(clearDraft);
  useEffect(() => {
    current.current = clearDraft;
  }, [clearDraft]);

  return () => current.current();
}

// The Server calls, the Connection's state and the Composer/navigation effects New Session's Empty Session needs.
export function useEmptySessionPorts(
  clearDraft: () => void,
): EmptySessionPorts {
  const client = useTRPCClient();

  return {
    open: (input) => client.session.new.mutate(input),
    // The shown New Session becomes the Session by its params alone: the same screen, no new page, and its Project left behind.
    handOff: (id) => router.setParams({ id, projectId: undefined }),
    clearDraft: useCurrentDraftClear(clearDraft),
    connectionState: useConnection().state,
  };
}
