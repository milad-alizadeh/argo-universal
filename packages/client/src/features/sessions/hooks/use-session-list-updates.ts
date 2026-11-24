import type { SessionListUpdate } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import type { TRPCSubscriptionResult } from '@trpc/tanstack-react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo, useRef, useState } from 'react';
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
  const [mountedAt] = useState(Date.now);

  return useMemo((): SessionListRefresh => {
    const list = trpc.session.list.pathFilter();

    const refetch = createCoalescedRefetch(() =>
      refreshSessionList(queryClient, list),
    );

    /*
     * The first start after mount rides a read made during this mount, so one that landed or is in flight is not asked again; a read kept from an earlier visit may predate changes, so it is.
     * The Server replays missed updates only to the first watcher, so every later start (a reconnect or a return to the foreground) asks again whatever the read's age.
     */
    const catchUp = (): void => {
      const restart = started.current;
      started.current = true;

      void queryClient.refetchQueries(
        restart
          ? list
          : {
              ...list,
              predicate: (query): boolean =>
                query.state.dataUpdatedAt < mountedAt,
            },
        { cancelRefetch: restart },
      );
    };

    // A row the list shows changes where it sits; only what the loaded pages cannot place asks the Server again.
    const apply = (update: SessionListUpdate): void => {
      if (applySessionListUpdate(queryClient, list, update)) refetch();
    };

    return { catchUp, apply };
  }, [queryClient, trpc, started, mountedAt]);
}

// Live list updates change the rows the list shows, or refetch its pages when they cannot, and resume after Connection recovery or when the window regains focus. The screen that owns the list passes `enabled` false until its query holds rows, from the Device or the Server, so an update has rows to land on.
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
