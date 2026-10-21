import { z } from 'zod';
import { ReplaceableSlotId } from '#plugin-replaceable-slot-id';

// A Slot id is versioned, so a later context shape gets a new id instead of breaking Plugins (Grafana's extension points).
export const projectDetailsSlotId = 'argo/project/details/v1';

export const sessionRowSlotId = 'argo/session/row/v1';

// Each Slot id names the one context shape core passes to it.
export const PluginSlotInput = z.discriminatedUnion('slotId', [
  z.strictObject({
    slotId: z.literal(projectDetailsSlotId),
    context: z.strictObject({ projectId: z.string().min(1) }),
  }),
  z.strictObject({
    slotId: z.literal(sessionRowSlotId),
    context: z.strictObject({
      sessionId: z.string().min(1),
      projectId: z.string().min(1),
      branch: z.string().nullable(),
    }),
  }),
]);

export type PluginSlotInput = z.infer<typeof PluginSlotInput>;

export const SlotId = z.union([
  z.literal(projectDetailsSlotId),
  z.literal(sessionRowSlotId),
  ReplaceableSlotId,
]);

export type SlotId = z.infer<typeof SlotId>;

// Where a Slot's contribution lives inside its Plugin; page paths start with `/`, so the two never meet.
export function slotPath({ slotId, context }: PluginSlotInput): string {
  return `slot:${slotId}:${JSON.stringify(context)}`;
}
