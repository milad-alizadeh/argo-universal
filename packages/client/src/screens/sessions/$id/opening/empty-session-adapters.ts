import type { InitialConfigOption, SessionConfigOption } from '@repo/contracts';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTRPCClient } from '#features/connection';
import type { EmptySessionPorts } from '#features/sessions';

type Client = ReturnType<typeof useTRPCClient>;

const setConfigOption = async (
  client: Client,
  sessionId: string,
  { configId, value }: InitialConfigOption,
): Promise<SessionConfigOption[]> => {
  const changed = await client.session.setConfigOption.mutate(
    typeof value === 'boolean'
      ? { sessionId, configId, type: 'boolean', value }
      : { sessionId, configId, type: 'id', value },
  );

  return changed.configOptions;
};

// The store keeps its ports; Composer supplies the current Project draft operation.
function useCurrentDraftClear(clearDraft: () => void): () => void {
  const current = useRef(clearDraft);
  useEffect(() => {
    current.current = clearDraft;
  }, [clearDraft]);

  return () => current.current();
}

// The Server calls and Composer/navigation effects New Session's Empty Session needs.
export function useEmptySessionPorts(
  clearDraft: () => void,
): EmptySessionPorts {
  const client = useTRPCClient();

  return {
    open: (input) => client.session.new.mutate(input),
    close: (sessionId) => client.session.close.mutate({ sessionId }),
    setConfigOption: (sessionId, change) =>
      setConfigOption(client, sessionId, change),
    prompt: (sessionId, prompt) =>
      client.session.prompt.mutate({ sessionId, prompt }),
    // The shown New Session becomes the Session by its params alone: the same screen, no new page, and its Project left behind.
    handOff: (id) => router.setParams({ id, projectId: undefined }),
    clearDraft: useCurrentDraftClear(clearDraft),
  };
}
