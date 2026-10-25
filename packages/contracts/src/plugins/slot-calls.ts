import { z } from 'zod';
import { AddOnlySlotId } from '#plugin-wire-slot';

// An items Slot's traffic: a provider's answer to one batched call by its id, its failure, or the Plugin's change signal.
export const SlotCall = z.discriminatedUnion('action', [
  z.object({ action: z.literal('items'), id: z.number(), items: z.json() }),
  z.object({ action: z.literal('failed'), id: z.number(), error: z.string() }),
  z.object({ action: z.literal('changed'), slotId: AddOnlySlotId }),
]);

export type SlotCall = z.infer<typeof SlotCall>;
