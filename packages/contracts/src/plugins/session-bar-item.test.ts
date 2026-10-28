import { expect, it } from 'vitest';
import { SessionBarItem } from './session-bar-item';
import { sessionBarSlotId, SlotItemsInput, slotRegistry } from './wire';

const inReview = '#412 · In review';

it('accepts a Session bar item with an icon, text and an action', () => {
  const item = {
    icon: { sf: 'ticket', material: 'confirmation_number' },
    text: inReview,
    action: { path: '/issues/412' },
  };

  expect(SessionBarItem.parse(item)).toEqual(item);
});

it.each([
  ['a tone', { text: inReview, tone: 'info' }],
  ['a tooltip', { text: inReview, tooltip: 'Issue 412' }],
  ['oversized text', { text: 'x'.repeat(81) }],
  ['empty text', { text: ' ' }],
  [
    'a kit tree',
    { type: 'Text', key: '0', props: {}, children: [], slots: {} },
  ],
])('refuses a Session bar item with %s', (_name, item) => {
  expect(SessionBarItem.safeParse(item).success).toBe(false);
});

it('asks the Session bar for one item per Plugin and Session, shown one at a time', () => {
  const input = {
    slotId: sessionBarSlotId,
    contexts: [{ sessionId: 'session', projectId: 'argo' }],
  };

  expect(SlotItemsInput.parse(input)).toEqual(input);
  expect(slotRegistry.find(({ id }) => id === sessionBarSlotId)).toMatchObject({
    content: {
      key: 'sessionId',
      limit: { phone: 1, desktop: 1, perPlugin: 1 },
    },
  });
});
