import type { SlotItems, SlotItemsInput } from '@repo/contracts/plugins/wire';
import { skipToken } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

const noItems: SlotItems = {};

// An items Slot's merged answers for a list, live from the Server; none until the list is known or the first snapshot arrives.
export function useSlotItems(input: SlotItemsInput | undefined): SlotItems {
  const trpc = useTRPC();

  const items = useSubscription(
    trpc.plugins.slotItems.subscriptionOptions(input ?? skipToken),
  );

  useResubscribeOnReconnect(items);

  return items.data ?? noItems;
}
