import type { SessionConfigOption, SessionSnapshot } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { writeSessionOptions } from '../api/session-options-cache';

interface OwnedOptions {
  agent: string;
  projectId: string;
  configOptions: SessionConfigOption[] | undefined;
}

const notOpened: OwnedOptions = {
  agent: '',
  projectId: '',
  configOptions: undefined,
};

// Every opened Session's options overwrite the cache, so the next New Session shows them at once.
export function useCacheSessionOptions(
  snapshot: SessionSnapshot | null | undefined,
): void {
  const queryClient = useQueryClient();
  const { agent, projectId, configOptions } = snapshot ?? notOpened;

  useEffect(() => {
    if (configOptions)
      writeSessionOptions(queryClient, { agent, projectId }, configOptions);
  }, [queryClient, agent, projectId, configOptions]);
}
