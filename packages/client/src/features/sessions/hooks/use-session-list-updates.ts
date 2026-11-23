import type { SessionListUpdate } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import type { TRPCSubscriptionResult } from '@trpc/tanstack-react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo } from 'react';
import type { ClientError } from '#features/connection';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { applySessionListUpdate } from '../api/apply-session-list-update';
import { createCoalescedRefetch } from '../api/coalesced-refetch';
import { refreshSessionList } from '../api/refresh-session-list';
import { useResubscribeOnFocus } from './use-resubscribe-on-focus';

type SessionListSubscription = TRPCSubscriptionResult<
  SessionListUpdate,
  ClientError
>;

type SessionListRefresh = {
  refetch: () => void;
  apply: (update: SessionListUpdate) => void;
};

function useSessionListRefresh(): SessionListRefresh {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMemo((): SessionListRefresh => {
    const list = trpc.session.list.pathFilter();

    const refetch = createCoalescedRefetch(() =>
      refreshSessionList(queryClient, list),
    );

    // A row the list shows changes where it sits; only what the loaded pages cannot place asks the Server again.
    const apply = (update: SessionListUpdate): void => {
      if (applySessionListUpdate(queryClient, list, update)) refetch();
    };

    return { refetch, apply };
  }, [queryClient, trpc]);
}

// Live list updates change the rows the list shows, or refetch its pages when they cannot, and resume after Connection recovery or when the window regains focus.
export function useSessionListUpdates(enabled = true): SessionListSubscription {
  const trpc = useTRPC();
  const { refetch, apply } = useSessionListRefresh();

  const subscription = useSubscription(
    trpc.session.listUpdates.subscriptionOptions(undefined, {
      enabled,
      onStarted: refetch,
      onData: apply,
    }),
  );

  useResubscribeOnReconnect(subscription);
  useResubscribeOnFocus(subscription);

  return subscription;
}
