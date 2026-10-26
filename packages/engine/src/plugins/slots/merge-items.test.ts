import {
  addOnlySlots,
  itemsSlotEntry,
  replaceableSlots,
  slotSchemas,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { mergeItems, shownLimit, type Contribution } from './merge-items';

const testSlotId = 'argo/test/v1';

// A Slot added only as a registry entry: the merge reads its key and limits off the entry.
const slots = slotSchemas(
  [
    ...addOnlySlots,
    itemsSlotEntry(testSlotId, z.strictObject({ itemId: z.string() }), {
      key: 'itemId',
      item: z.strictObject({ label: z.string() }),
      limit: { phone: 1, desktop: 2, perPlugin: 3 },
    }),
  ],
  replaceableSlots,
);

const entry = slots.itemsSlot(testSlotId);

const contexts = [{ itemId: 'a' }, { itemId: 'b' }, { itemId: 'a' }];

const contributions: Contribution[] = [
  { pluginId: 'early', items: { a: [{ label: 'one' }, { label: 'two' }] } },
  { pluginId: 'late', items: { a: [{ label: 'three' }], c: [{ label: 'x' }] } },
];

it.each([
  ['a phone', 'ios', 1],
  ['a phone', 'android', 1],
  ['a desktop', 'desktop', 2],
  ['the web', 'web', 2],
] as const)('shows the entry limit on %s (%s)', (_name, platform, limit) => {
  if (!entry) throw new Error('test Slot is missing');

  expect(shownLimit(entry, { platform, wireVersion: 3 })).toBe(limit);
});

it('merges a registry-only Slot in Plugin order and keeps the rest as attributed overflow', () => {
  if (!entry) throw new Error('test Slot is missing');

  const merged = mergeItems(
    { entry, contexts, surface: { platform: 'web', wireVersion: 3 } },
    contributions,
  );

  expect(merged).toEqual({
    a: {
      items: [
        { pluginId: 'early', item: { label: 'one' } },
        { pluginId: 'early', item: { label: 'two' } },
      ],
      overflow: [{ pluginId: 'late', item: { label: 'three' } }],
    },
  });
  expect(slots.SlotItems.parse(merged)).toEqual(merged);
});
