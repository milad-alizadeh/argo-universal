import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { ConfigurationChange } from '#features/composer';
import { useTRPCClient } from '#features/connection';
import { type EmptySessionPorts } from '#features/sessions';

type Client = ReturnType<typeof useTRPCClient>;

// Closing on the way out can fail with the Connection; nothing waits for it.
export const closeQuietly = (client: Client, sessionId: string): void => {
  client.session.close.mutate({ sessionId }).catch(() => {});
};

// A Session that opens after the screen was left is closed at once.
const openSession = async (
  client: Client,
  input: SessionNewInput,
  signal: AbortSignal,
): Promise<{ sessionId: string }> => {
  const opened = await client.session.new.mutate(input);

  if (signal.aborted) closeQuietly(client, opened.sessionId);

  return opened;
};

const setConfigOption = async (
  client: Client,
  sessionId: string,
  { configId, value }: ConfigurationChange,
): Promise<SessionConfigOption[]> => {
  const changed = await client.session.setConfigOption.mutate({
    sessionId,
    configId,
    type: 'id',
    value,
  });

  return changed.configOptions;
};

// The actor keeps its adapters; Composer supplies the current Project draft operation.
function useCurrentDraftClear(clearDraft: () => void): () => void {
  const current = useRef(clearDraft);
  useEffect(() => {
    current.current = clearDraft;
  }, [clearDraft]);

  return () => current.current();
}

const serverPorts = (
  client: Client,
): Pick<
  EmptySessionPorts,
  'open' | 'close' | 'setConfigOption' | 'prompt'
> => ({
  open: (input, signal) => openSession(client, input, signal),
  close: (sessionId) => client.session.close.mutate({ sessionId }),
  setConfigOption: (sessionId, change) =>
    setConfigOption(client, sessionId, change),
  prompt: (sessionId, prompt) =>
    client.session.prompt.mutate({ sessionId, prompt }),
});

// The Server calls and Composer/navigation effects the machine owns.
export function useEmptySessionPorts(
  clearDraft: () => void,
): EmptySessionPorts {
  const client = useTRPCClient();
  const clear = useCurrentDraftClear(clearDraft);

  return {
    ...serverPorts(client),
    // The shown New Session becomes the Session by its params alone: the same screen, no new page, and its Project left behind.
    handOff: (id) => router.setParams({ id, projectId: undefined }),
    clearDraft: clear,
  };
}
