import { expect, it } from 'vitest';
import {
  DeclaredItems,
  DeclaredItemsInput,
  DeclaredSlotId,
  sessionHeaderSlotId,
} from './declared-slots';
import { PluginManifest } from './plugins';
import { sessionRowSlotId } from './wire';

const openIssue = {
  id: 'open-issue',
  label: 'Open Issue',
  icon: { sf: 'ticket', material: 'confirmation_number' },
  placement: 'header',
  target: { type: 'page', path: '/issues' },
};

// A manifest's `contributes.declared` as an author writes it, before Argo checks it.
type AuthoredDeclared = Record<string, readonly object[]>;

const manifestDeclaring = (
  declared: AuthoredDeclared,
): ReturnType<typeof PluginManifest.safeParse> =>
  PluginManifest.safeParse({
    id: 'tracker',
    name: 'Tracker',
    version: '1.0.0',
    engines: { argo: '>=0.0.0' },
    main: 'index.js',
    icon: { material: 'extension' },
    contributes: { nav: [], declared },
  });

const headerActions = (
  actions: readonly object[],
): Record<DeclaredSlotId, readonly object[]> => ({
  [sessionHeaderSlotId]: actions,
});

it('lets a manifest declare Session header actions for the header and the menu', () => {
  const actions = [
    openIssue,
    { ...openIssue, id: 'board', label: 'Board', placement: 'menu' },
  ];

  expect(
    manifestDeclaring(headerActions(actions)).data?.contributes.declared,
  ).toEqual(headerActions(actions));
});

it.each([
  ['an unknown field', { ...openIssue, tone: 'danger' }],
  ['a kit tree', { ...openIssue, label: { type: 'Text', key: '0' } }],
  ['an oversized label', { ...openIssue, label: 'x'.repeat(41) }],
  ['no icon', { ...openIssue, icon: undefined }],
  ['an unknown placement', { ...openIssue, placement: 'toolbar' }],
  [
    'a page outside the Plugin',
    { ...openIssue, target: { type: 'page', path: 'https://x' } },
  ],
  [
    'a target Argo cannot run',
    { ...openIssue, target: { type: 'command', id: 'sync' } },
  ],
])('refuses a Session header action with %s', (_name, action) => {
  expect(manifestDeclaring(headerActions([action])).success).toBe(false);
});

it('refuses two Session header actions with one id', () => {
  expect(manifestDeclaring(headerActions([openIssue, openIssue])).success).toBe(
    false,
  );
});

it('refuses more Session header actions than one Plugin may declare', () => {
  const many = Array.from({ length: 5 }, (_, at) => ({
    ...openIssue,
    id: `action-${at}`,
  }));

  expect(manifestDeclaring(headerActions(many)).success).toBe(false);
});

it('places a Plugin that only declares header actions by its order', () => {
  const declared = headerActions([openIssue]);

  expect(
    PluginManifest.safeParse({
      id: 'tracker',
      name: 'Tracker',
      version: '1.0.0',
      engines: { argo: '>=0.0.0' },
      main: 'index.js',
      icon: { material: 'extension' },
      contributes: { nav: [], declared, order: 2 },
    }).success,
  ).toBe(true);
});

it('refuses declared content for a Slot whose Plugin answers it at run time', () => {
  expect(
    manifestDeclaring({ [sessionRowSlotId]: [{ text: 'Issue 412' }] }).success,
  ).toBe(false);
});

it('asks for a declared Slot by its id only', () => {
  expect(DeclaredSlotId.parse(sessionHeaderSlotId)).toBe(sessionHeaderSlotId);
  expect(
    DeclaredItemsInput.safeParse({ slotId: sessionRowSlotId }).success,
  ).toBe(false);
});

it('answers a declared Slot with each item and its Plugin', () => {
  const items = [{ pluginId: 'tracker', item: openIssue }];

  expect(DeclaredItems.parse(items)).toEqual(items);
});
