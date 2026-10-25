import { expect, it } from 'vitest';
import { z } from 'zod';
import {
  addOnlySlots,
  itemsSlotEntry,
  replaceableSlots,
} from './slot-registry';
import { slotSchemas } from './wire-slot';

const testSlotId = 'argo/test/v1';

// A Slot added only as a registry entry, with no other edit anywhere.
const slots = slotSchemas(
  [
    ...addOnlySlots,
    itemsSlotEntry(testSlotId, z.strictObject({ itemId: z.string().min(1) }), {
      key: 'itemId',
      item: z.strictObject({ label: z.string().max(4) }),
      limit: { phone: 1, desktop: 2, perPlugin: 3 },
    }),
  ],
  replaceableSlots,
);

it('validates the id of a Slot registered only in the registry', () => {
  expect(slots.SlotId.parse(testSlotId)).toBe(testSlotId);
  expect(slots.AddOnlySlotId.parse(testSlotId)).toBe(testSlotId);
  expect(slots.ReplaceableSlotId.safeParse(testSlotId).success).toBe(false);
});

it('validates the batched call of a Slot registered only in the registry', () => {
  const input = { slotId: testSlotId, contexts: [{ itemId: 'a' }] };

  expect(slots.SlotItemsInput.parse(input)).toEqual(input);
  expect(
    slots.SlotItemsInput.safeParse({
      slotId: testSlotId,
      contexts: [{ projectId: 'argo' }],
    }).success,
  ).toBe(false);
});

it('validates the merged answer of a Slot registered only in the registry', () => {
  const merged = {
    a: { items: [{ pluginId: 'p', item: { label: 'one' } }], overflow: [] },
  };

  expect(slots.SlotItems.parse(merged)).toEqual(merged);
  expect(
    slots.SlotItems.safeParse({
      a: {
        items: [{ pluginId: 'p', item: { label: 'too long' } }],
        overflow: [],
      },
    }).success,
  ).toBe(false);
});

it('finds the entry of a Slot registered only in the registry', () => {
  expect(slots.itemsSlot(testSlotId)?.content).toMatchObject({
    key: 'itemId',
    limit: { phone: 1, desktop: 2, perPlugin: 3 },
  });
});
