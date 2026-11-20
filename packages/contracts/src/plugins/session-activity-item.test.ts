import { expect, it } from 'vitest';
import {
  SessionActivityItem,
  sessionActivitySlotId,
  slotRegistry,
} from './wire';

it('makes the Activity line a Single-owner Slot', () => {
  expect(
    slotRegistry.find(({ id }) => id === sessionActivitySlotId),
  ).toMatchObject({ content: { owners: 'one' } });
});

it.each([
  ['no text', { text: '' }],
  ['an icon', { text: 'Awaiting review', icon: { material: 'flag' } }],
])('refuses an Activity line with %s', (_name, item) => {
  expect(SessionActivityItem.safeParse(item).success).toBe(false);
});
