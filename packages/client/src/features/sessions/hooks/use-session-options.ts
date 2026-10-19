import type { SessionConfigOption } from '@repo/contracts';
import { skipToken, useIsRestoring, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPCClient } from '#features/connection';
import {
  type SessionOptions,
  type SessionOptionsChoice,
  sessionOptions,
  sessionOptionsQuery,
} from '../utils/session-options-cache';

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

type ReadOptions = (context: {
  signal: AbortSignal;
}) => Promise<SessionConfigOption[]>;

type ReadOwner = { agent: string; projectId: string };

// Only a New worktree with an Agent and a Project reads.
const reads = (owner: OptionsOwner): owner is OptionsOwner & ReadOwner =>
  owner.inNewWorktree && !!owner.agent && !!owner.projectId;

// The query runs the read only while nothing is cached.
const readOptions = (
  client: ReturnType<typeof useTRPCClient>,
  owner: OptionsOwner,
): ReadOptions | typeof skipToken => {
  if (!reads(owner)) return skipToken;
  const { agent, projectId } = owner;

  return ({ signal }) =>
    client.session.agentOptions.query({ agent, projectId }, { signal });
};

// A failed read shows no options, and Send's own open reports why.
const useCached = (owner: OptionsOwner): CachedOptions => {
  const query = sessionOptionsQuery(owner.agent ?? '', owner.projectId ?? '');
  const queryFn = readOptions(useTRPCClient(), owner);
  const { data, isFetching } = useQuery({ ...query, queryFn, retry: false });

  return { cached: data, restoring: useIsRestoring(), reading: isFetching };
};

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
