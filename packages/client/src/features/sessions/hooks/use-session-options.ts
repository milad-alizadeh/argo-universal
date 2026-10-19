import type { SessionConfigOption } from '@repo/contracts';
import { skipToken, useIsRestoring, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPCClient } from '#features/connection';
import { useErrorToast } from '#primitives/overlays/toast';
import {
  readAgentOptions,
  sessionOptionsQuery,
  type SessionOptionsOwner,
} from '../api/session-options-cache';
import { optionsReadToast } from '../utils/options-read-toast';
import {
  type SessionOptions,
  type SessionOptionsChoice,
  sessionOptions,
} from '../utils/session-options';
import { useConnectionDropped } from './use-connection-dropped';

interface CachedOptions {
  cached: SessionConfigOption[] | undefined;
  // While the persisted cache restores, nobody knows yet whether it holds options.
  restoring: boolean;
  // The Server is reading a New worktree's options.
  reading: boolean;
}

type OptionsOwner = Pick<
  SessionOptionsChoice,
  'agent' | 'projectId' | 'inNewWorktree'
>;

// Only a New worktree with an Agent and a Project reads.
const reads = ({ inNewWorktree, agent, projectId }: OptionsOwner): boolean =>
  inNewWorktree && !!agent && !!projectId;

const ownerOf = ({ agent, projectId }: OptionsOwner): SessionOptionsOwner => ({
  agent: agent ?? '',
  projectId: projectId ?? '',
});

// Send's own open reports the Agent's failure; a toast any other.
function useReadFailure(error: Error | null): void {
  const dropped = useConnectionDropped(error);

  useErrorToast(optionsReadToast(error, dropped));
}

// A failed read shows no options.
function useCached(owner: OptionsOwner): CachedOptions {
  const client = useTRPCClient();
  const input = ownerOf(owner);
  const read = reads(owner) ? readAgentOptions(client, input) : skipToken;
  const query = useQuery(sessionOptionsQuery(input, read));

  useReadFailure(query.error);

  return {
    cached: query.data,
    restoring: useIsRestoring(),
    reading: query.isFetching,
  };
}

// New Session's model, effort and mode at once, before any Session opens.
export function useSessionOptions(
  choice: SessionOptionsChoice,
): SessionOptions {
  const { saved, picks } = choice;
  const { cached, restoring, reading } = useCached(choice);
  const opening = (choice.opening && !restoring) || reading;

  // The same options while nothing changes, so the screen's effects run only on a change.
  return useMemo(
    () => sessionOptions(cached, { saved, picks, opening }),
    [cached, saved, picks, opening],
  );
}
