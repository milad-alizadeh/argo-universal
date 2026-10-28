import { expect, it } from 'vitest';
import {
  SessionActivityItem,
  sessionActivitySlotId,
  SlotItemsInput,
  slotRegistry,
} from './wire';

const rowContext = { sessionId: 'session', projectId: 'argo' };

it('asks the Activity line for one line per Session, as a Single-owner Slot', () => {
  const input = { slotId: sessionActivitySlotId, contexts: [rowContext] };

  expect(SlotItemsInput.parse(input)).toEqual(input);
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
