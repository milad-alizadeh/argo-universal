import { expect, it } from 'vitest';
import {
  ProjectDetailsItem,
  projectDetailsSlotId,
  SlotItemsInput,
} from './wire';

// Project details is an items Slot: one item is one row, and the row the Issue tracker sends is the example (ADR-0046).
const tracker = 'Issue tracker';

it('asks Project details for a list keyed by Project id', () => {
  const input = {
    slotId: projectDetailsSlotId,
    contexts: [{ projectId: 'argo' }, { projectId: 'bento' }],
  };

  expect(SlotItemsInput.parse(input)).toEqual(input);
});

it.each([
  ['a key the Slot does not take', { projectId: 'argo', path: '/' }],
  ['an empty Project id', { projectId: '' }],
])('refuses a Project details context with %s', (_name, context) => {
  expect(
    SlotItemsInput.safeParse({
      slotId: projectDetailsSlotId,
      contexts: [context],
    }).success,
  ).toBe(false);
});

it('accepts a Project details row with every field', () => {
  const item = {
    icon: { sf: 'ticket', material: 'confirmation_number' },
    title: tracker,
    value: 'GitHub Issues',
    tone: 'accent',
    action: { path: '/projects/argo/tracker' },
  };

  expect(ProjectDetailsItem.parse(item)).toEqual(item);
});

it.each([
  [
    'a kit tree',
    { type: 'Text', key: '0', props: {}, children: [], slots: {} },
  ],
  ['no title', { value: 'GitHub Issues' }],
  ['an unknown field', { title: tracker, badge: 'loud' }],
  ['an oversized title', { title: 'x'.repeat(41) }],
  ['an oversized value', { title: tracker, value: 'x'.repeat(41) }],
  [
    'an action outside the Plugin',
    { title: tracker, action: { path: 'https://x' } },
  ],
])('refuses a Project details row with %s', (_name, item) => {
  expect(ProjectDetailsItem.safeParse(item).success).toBe(false);
});
