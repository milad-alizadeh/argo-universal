import type {
  ItemsContext,
  SlotItems,
  SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { skipToken } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

/*
 * An items Slot's merged answers, with the contexts they answer for, so a reader knows which rows they cover. The
 * contexts are the ones that Slot takes, such as a Project for Project details and a Session for the Session Slots.
 */
export interface SlotItemsSnapshot<Context = ItemsContext> {
  contexts: readonly Context[];
  items: SlotItems;
}

/*
 * An items Slot's merged answers for a list, live from the Server; none until the list is known or the first snapshot
 * arrives. The last snapshot stays while a changed list asks again, so a row that already had items keeps them.
 */
export function useSlotItems<Input extends SlotItemsInput>(
  input: Input | undefined,
): SlotItemsSnapshot<Input['contexts'][number]> {
  const [snapshot, setSnapshot] = useState<
    SlotItemsSnapshot<Input['contexts'][number]>
  >({ contexts: [], items: {} });

  const items = useSubscription(
    useTRPC().plugins.slotItems.subscriptionOptions(input ?? skipToken, {
      onData: (answers) =>
        setSnapshot({ contexts: input?.contexts ?? [], items: answers }),
    }),
  );

  useResubscribeOnReconnect(items);

  return snapshot;
}
