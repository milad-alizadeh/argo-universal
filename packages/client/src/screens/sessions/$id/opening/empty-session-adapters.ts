import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useConnection, useTRPC, useTRPCClient } from '#features/connection';
import type { EmptySessionPorts } from '#features/sessions';

export type EmptySessionDraftPorts = Pick<
  EmptySessionPorts,
  'clearDraft' | 'forgetSentDraft'
>;

// The store keeps its ports; Composer supplies the current Project draft operation.
function useCurrentDraftClear(clearDraft: () => void): () => void {
  const current = useRef(clearDraft);
  useEffect(() => {
    current.current = clearDraft;
  }, [clearDraft]);

  return () => current.current();
}

// The Server calls, the Connection's state and the Composer/navigation effects New Session's Empty Session needs.
export function useEmptySessionPorts({
  clearDraft,
  forgetSentDraft,
}: EmptySessionDraftPorts): EmptySessionPorts {
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const projects = useTRPC().project.list.queryFilter();

  return {
    // A sent New Session remembers its Checkout choice on the Project, so the kept Project list is refetched.
    open: async (input) => {
      const opened = await client.session.new.mutate(input);
      void queryClient.invalidateQueries(projects);

      return opened;
    },
    // The shown New Session becomes the Session by its params alone: the same screen, no new page, and its Project and draft left behind.
    handOff: (id) =>
      router.setParams({ id, projectId: undefined, draft: undefined }),
    clearDraft: useCurrentDraftClear(clearDraft),
    forgetSentDraft,
    connectionState: useConnection().state,
  };
}
