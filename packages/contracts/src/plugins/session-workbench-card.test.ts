import { expect, it } from 'vitest';
import {
  DeclaredItems,
  DeclaredSlotId,
  sessionWorkbenchSlotId,
} from './declared-slots';
import {
  headerActions,
  issueCard,
  manifestDeclaring,
  openIssue,
  workbenchCards,
} from './declared-slots.mocks';

it('lets a manifest declare a Workbench card with a page and its full view', () => {
  expect(
    manifestDeclaring(workbenchCards([issueCard])).data?.contributes.declared,
  ).toEqual(workbenchCards([issueCard]));
});

it('lets a manifest declare a Workbench card that stays a card', () => {
  const card = { ...issueCard, tab: undefined };

  expect(manifestDeclaring(workbenchCards([card])).success).toBe(true);
});

it.each([
  ['an unknown field', { ...issueCard, tone: 'danger' }],
  ['a kit tree', { ...issueCard, title: { type: 'Text', key: '0' } }],
  ['an oversized title', { ...issueCard, title: 'x'.repeat(41) }],
  ['no icon', { ...issueCard, icon: undefined }],
  ['no page', { ...issueCard, page: undefined }],
  ['a page outside the Plugin', { ...issueCard, page: 'https://x' }],
  ['a full view outside the Plugin', { ...issueCard, tab: 'https://x' }],
])('refuses a Workbench card with %s', (_name, card) => {
  expect(manifestDeclaring(workbenchCards([card])).success).toBe(false);
});

it('refuses a second Workbench card from one Plugin', () => {
  const second = { ...issueCard, id: 'board' };

  expect(manifestDeclaring(workbenchCards([issueCard, second])).success).toBe(
    false,
  );
});

it('lets a header action open a Workbench card the Plugin declares', () => {
  const action = { ...openIssue, target: { type: 'card', cardId: 'issue' } };

  expect(
    manifestDeclaring({
      ...headerActions([action]),
      ...workbenchCards([issueCard]),
    }).success,
  ).toBe(true);
});

it('refuses a header action that opens a Workbench card nobody declares', () => {
  const action = { ...openIssue, target: { type: 'card', cardId: 'board' } };

  expect(
    manifestDeclaring({
      ...headerActions([action]),
      ...workbenchCards([issueCard]),
    }).success,
  ).toBe(false);
});

it('answers the Workbench Slot with each card and its Plugin', () => {
  const items = [{ pluginId: 'tracker', item: issueCard }];

  expect(DeclaredItems.parse(items)).toEqual(items);
});

it('asks for the Workbench Slot by its id', () => {
  expect(DeclaredSlotId.parse(sessionWorkbenchSlotId)).toBe(
    sessionWorkbenchSlotId,
  );
});
