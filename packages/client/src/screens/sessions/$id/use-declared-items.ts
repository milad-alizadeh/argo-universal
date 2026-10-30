import type { DeclaredSlotId } from '@repo/contracts/plugins/declared-slots';
import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';
import { useTRPC } from '#features/connection';

// What this reader needs of a declared Slot: which Slot to ask for, and the shape to read its items back as.
interface ReadableSlot<Item extends z.ZodObject> {
  id: DeclaredSlotId;
  content: { item: Item };
}

const noItems: { pluginId: string; item: unknown }[] = [];

/*
 * One declared Slot's items from the enabled Plugins' manifests, in Slot order, so no Plugin starts to answer them
 * (ADR-0025 lazy start). The Server answers every declared Slot through one procedure, so each item is read back
 * against the Slot's own schema and anything that is not its shape is dropped.
 */
export function useDeclaredItems<Item extends z.ZodObject>(
  slot: ReadableSlot<Item>,
): { pluginId: string; item: z.output<Item> }[] {
  const trpc = useTRPC();

  const { data = noItems } = useQuery(
    trpc.plugins.declared.queryOptions({ slotId: slot.id }),
  );

  return data.flatMap(({ pluginId, item }) => {
    const read = slot.content.item.safeParse(item);

    return read.success ? [{ pluginId, item: read.data }] : [];
  });
}
