import { expect, it } from 'vitest';
import { SessionBarItem } from './session-bar-item';
import { sessionBarSlotId, SlotItemsInput, slotRegistry } from './wire';

const inReview = '#412 · In review';

it('accepts a Session bar item with an icon, text, a tone and an action', () => {
  const item = {
    icon: { sf: 'ticket', material: 'confirmation_number' },
    text: inReview,
    tone: 'info',
    action: { path: '/issues/412' },
  };

  expect(SessionBarItem.parse(item)).toEqual(item);
});

it.each([
  ['a tone Argo has no token for', { text: inReview, tone: 'purple' }],
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

it('accepts multiple lines per Plugin and Session, with one line on the phone strip', () => {
  const input = {
    slotId: sessionBarSlotId,
    contexts: [{ sessionId: 'session', projectId: 'argo' }],
  };

  expect(SlotItemsInput.parse(input)).toEqual(input);
  expect(slotRegistry.find(({ id }) => id === sessionBarSlotId)).toMatchObject({
    content: {
      key: 'sessionId',
      limit: { phone: 1, desktop: 1, perPlugin: 500 },
    },
  });
});
