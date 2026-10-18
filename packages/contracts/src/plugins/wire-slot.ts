import { z } from 'zod';

// A Slot id is versioned, so a later context shape gets a new id instead of breaking Plugins (Grafana's extension points).
export const projectDetailsSlotId = 'argo/project/details/v1';

// Each Slot id names the one context shape core passes to it.
export const PluginSlotInput = z.discriminatedUnion('slotId', [
  z.strictObject({
    slotId: z.literal(projectDetailsSlotId),
    context: z.strictObject({ projectId: z.string().min(1) }),
  }),
]);

export type PluginSlotInput = z.infer<typeof PluginSlotInput>;

export const SlotId = z.enum([projectDetailsSlotId]);

export type SlotId = z.infer<typeof SlotId>;

// Where a Slot's contribution lives inside its Plugin; page paths start with `/`, so the two never meet.
export function slotPath({ slotId, context }: PluginSlotInput): string {
  return `slot:${slotId}:${JSON.stringify(context)}`;
}
