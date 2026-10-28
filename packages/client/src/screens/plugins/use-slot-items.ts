import type { SlotItems, SlotItemsInput } from '@repo/contracts/plugins/wire';
import { skipToken } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

// An items Slot's merged answers, with the contexts they answer for, so a reader knows which rows they cover.
export interface SlotItemsSnapshot {
  contexts: SlotItemsInput['contexts'];
  items: SlotItems;
}

const noSnapshot: SlotItemsSnapshot = { contexts: [], items: {} };

/*
 * An items Slot's merged answers for a list, live from the Server; none until the list is known or the first snapshot
 * arrives. The last snapshot stays while a changed list asks again, so a row that already had items keeps them.
 */
export function useSlotItems(
  input: SlotItemsInput | undefined,
): SlotItemsSnapshot {
  const trpc = useTRPC();
  const [snapshot, setSnapshot] = useState(noSnapshot);

  const items = useSubscription(
    trpc.plugins.slotItems.subscriptionOptions(input ?? skipToken, {
      onData: (answers) =>
        setSnapshot({ contexts: input?.contexts ?? [], items: answers }),
    }),
  );

  useResubscribeOnReconnect(items);

  return snapshot;
}
