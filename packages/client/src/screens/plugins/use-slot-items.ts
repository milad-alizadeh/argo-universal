import type { SlotItems, SlotItemsInput } from '@repo/contracts/plugins/wire';
import { skipToken } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

const noItems: SlotItems = {};

/*
 * An items Slot's merged answers for a list, live from the Server; none until the list is known or the first snapshot
 * arrives. The last answers stay while a changed list asks again, so a row that already had items keeps them.
 */
export function useSlotItems(input: SlotItemsInput | undefined): SlotItems {
  const trpc = useTRPC();
  const [answers, setAnswers] = useState(noItems);

  const items = useSubscription(
    trpc.plugins.slotItems.subscriptionOptions(input ?? skipToken, {
      onData: setAnswers,
    }),
  );

  useResubscribeOnReconnect(items);

  return answers;
}
