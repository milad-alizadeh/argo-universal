import type { SessionListUpdate } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import type { TRPCSubscriptionResult } from '@trpc/tanstack-react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo, useRef } from 'react';
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
  catchUp: () => void;
  apply: (update: SessionListUpdate) => void;
};

function useSessionListRefresh(): SessionListRefresh {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const started = useRef(false);

  return useMemo((): SessionListRefresh => {
    const list = trpc.session.list.pathFilter();

    const refetch = createCoalescedRefetch(() =>
      refreshSessionList(queryClient, list),
    );

    /*
     * The first start after mount rides the read that just ran, so a fresh or in-flight read is not asked again.
     * The Server replays missed updates only to the first watcher, so every later start (a reconnect or a return to the foreground) asks again whatever the read's age.
     */
    const catchUp = (): void => {
      const restart = started.current;
      started.current = true;

      void queryClient.refetchQueries(
        restart ? list : { ...list, stale: true },
        {
          cancelRefetch: restart,
        },
      );
    };

    // A row the list shows changes where it sits; only what the loaded pages cannot place asks the Server again.
    const apply = (update: SessionListUpdate): void => {
      if (applySessionListUpdate(queryClient, list, update)) refetch();
    };

    return { catchUp, apply };
  }, [queryClient, trpc, started]);
}

// Live list updates change the rows the list shows, or refetch its pages when they cannot, and resume after Connection recovery or when the window regains focus.
export function useSessionListUpdates(enabled = true): SessionListSubscription {
  const trpc = useTRPC();
  const { catchUp, apply } = useSessionListRefresh();

  const subscription = useSubscription(
    trpc.session.listUpdates.subscriptionOptions(undefined, {
      enabled,
      onStarted: catchUp,
      onData: apply,
    }),
  );

  useResubscribeOnReconnect(subscription);
  useResubscribeOnFocus(subscription);

  return subscription;
}
