import type { SessionListUpdate } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import type { TRPCSubscriptionResult } from '@trpc/tanstack-react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo } from 'react';
import type { ClientError } from '#features/connection';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { useResubscribeOnFocus } from '../hooks/use-resubscribe-on-focus';
import { createCoalescedRefetch } from '../state/coalesced-refetch';

type SessionListSubscription = TRPCSubscriptionResult<
  SessionListUpdate,
  ClientError
>;

function useSessionListRefetch(): () => void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMemo(
    () =>
      createCoalescedRefetch(() =>
        queryClient.invalidateQueries(trpc.session.list.pathFilter(), {
          cancelRefetch: false,
        }),
      ),
    [queryClient, trpc],
  );
}

// Live list updates refetch its pages and resume after Connection recovery or when the window regains focus.
export function useSessionListUpdates(): SessionListSubscription {
  const trpc = useTRPC();
  const refetch = useSessionListRefetch();

  const subscription = useSubscription(
    trpc.session.listUpdates.subscriptionOptions(undefined, {
      onStarted: refetch,
      onData: refetch,
    }),
  );

  useResubscribeOnReconnect(subscription);
  useResubscribeOnFocus(subscription);

  return subscription;
}
