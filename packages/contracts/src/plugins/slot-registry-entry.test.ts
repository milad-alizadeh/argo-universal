import { expect, it } from 'vitest';
import { z } from 'zod';
import { addOnly, addOnlySlots, replaceableSlots } from './slot-registry';
import { slotSchemas } from './wire-slot';

const testSlotId = 'argo/test/v1';

// A Slot added only as a registry entry, with no other edit anywhere.
const slots = slotSchemas(
  [
    ...addOnlySlots,
    addOnly(testSlotId, z.strictObject({ itemId: z.string().min(1) }), {
      part: 'ListItem',
      slot: 'meta',
    }),
  ],
  replaceableSlots,
);

it('validates a Slot registered only in the registry', () => {
  expect(slots.SlotId.parse(testSlotId)).toBe(testSlotId);
  expect(slots.AddOnlySlotId.parse(testSlotId)).toBe(testSlotId);
  expect(slots.ReplaceableSlotId.safeParse(testSlotId).success).toBe(false);
  expect(
    slots.PluginSlotInput.parse({
      slotId: testSlotId,
      context: { itemId: 'a' },
    }),
  ).toEqual({ slotId: testSlotId, context: { itemId: 'a' } });
  expect(
    slots.PluginSlotInput.safeParse({
      slotId: testSlotId,
      context: { projectId: 'argo' },
    }).success,
  ).toBe(false);
});

it('reads the content rule of a Slot registered only in the registry', () => {
  expect(slots.contentRule(testSlotId)).toEqual({
    part: 'ListItem',
    slot: 'meta',
  });
});
