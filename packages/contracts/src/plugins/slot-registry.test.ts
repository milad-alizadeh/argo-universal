import { expect, it } from 'vitest';
import { PluginManifest } from './plugins';
import { ReplaceableInput } from './replaceable-input';
import {
  AddOnlySlotId,
  projectDetailsSlotId,
  ReplaceableSlotId,
  sessionActivitySlotId,
  sessionBarSlotId,
  SessionRowItem,
  sessionRowSlotId,
  SlotId,
  SlotItemsInput,
  slotRegistry,
} from './wire';
import { messageSlotId, toolCallSlotId } from './wire-slot';

const manifestWith = (
  contributes: Readonly<Record<string, readonly string[] | number>>,
): ReturnType<typeof PluginManifest.safeParse> =>
  PluginManifest.safeParse({
    id: 'slots',
    name: 'Slots',
    version: '1.0.0',
    engines: { argo: '>=0.0.0' },
    main: 'index.js',
    icon: { material: 'extension' },
    capabilities: [],
    contributes: { nav: [], ...contributes },
  });

const rowContext = { sessionId: 'session', projectId: 'argo' };

it('keeps every Slot id with its kind', () => {
  expect(slotRegistry.map(({ id, kind }) => [id, kind])).toEqual([
    [projectDetailsSlotId, 'add-only'],
    [sessionRowSlotId, 'add-only'],
    [sessionActivitySlotId, 'add-only'],
    [sessionBarSlotId, 'add-only'],
    [toolCallSlotId, 'replaceable'],
    [messageSlotId, 'replaceable'],
  ]);
});

it('asks the Session row for a whole list keyed by Session id', () => {
  const input = {
    slotId: sessionRowSlotId,
    contexts: [rowContext, { sessionId: 'other', projectId: 'argo' }],
  };

  expect(SlotItemsInput.parse(input)).toEqual(input);
});

it.each([
  ['a branch', { ...rowContext, branch: 'main' }],
  ['no Project', { sessionId: 'session' }],
])('refuses a Session row context with %s', (_name, context) => {
  expect(
    SlotItemsInput.safeParse({ slotId: sessionRowSlotId, contexts: [context] })
      .success,
  ).toBe(false);
});

it('accepts a Session row item with every field', () => {
  const item = {
    icon: { sf: 'ticket', material: 'confirmation_number' },
    text: 'Issue 412',
    tone: 'accent',
    tooltip: 'Issue 412: In review',
    action: { path: '/issues/412' },
  };

  expect(SessionRowItem.parse(item)).toEqual(item);
});

it.each([
  [
    'a kit tree',
    { type: 'Text', key: '0', props: {}, children: [], slots: {} },
  ],
  ['an unknown field', { text: 'Issue 412', badge: 'loud' }],
  ['oversized text', { text: 'x'.repeat(41) }],
  ['empty text', { text: ' ' }],
  ['an unknown tone', { text: 'Issue 412', tone: 'shouting' }],
  [
    'an action outside the Plugin',
    { text: 'Issue 412', action: { path: 'https://x' } },
  ],
])('refuses a Session row item with %s', (_name, item) => {
  expect(SessionRowItem.safeParse(item).success).toBe(false);
});

it.each([toolCallSlotId, messageSlotId])(
  'keeps Replaceable Slot %s out of the add-only ids',
  (slotId) => {
    expect(SlotId.parse(slotId)).toBe(slotId);
    expect(ReplaceableSlotId.parse(slotId)).toBe(slotId);
    expect(AddOnlySlotId.safeParse(slotId).success).toBe(false);
  },
);

it('lets a manifest declare add-only Slots', () => {
  const slots = [projectDetailsSlotId, sessionRowSlotId];

  expect(manifestWith({ slots }).data?.contributes.slots).toEqual(slots);
});

it('refuses a Replaceable Slot among a manifest Slots', () => {
  expect(manifestWith({ slots: [toolCallSlotId] }).success).toBe(false);
});

it('lets a ui.render Plugin declare the Replaceable Slots it draws', () => {
  const contributes = {
    hooks: ['ui.render'],
    renders: [toolCallSlotId],
    order: 3,
  };

  expect(manifestWith(contributes).data?.contributes).toMatchObject(
    contributes,
  );
});

it.each([
  ['an add-only Slot', { hooks: ['ui.render'], renders: [sessionRowSlotId] }],
  ['no ui.render Hook', { renders: [messageSlotId] }],
])('refuses renders naming %s', (_name, contributes) => {
  expect(manifestWith(contributes).success).toBe(false);
});

it('refuses the Composer tray as a Slot', () => {
  const slotId = 'argo/composer/above/v1';

  expect(SlotId.safeParse(slotId).success).toBe(false);
  expect(
    ReplaceableInput.safeParse({
      slotId,
      props: { wide: true, inactive: false },
    }).success,
  ).toBe(false);
  expect(manifestWith({ slots: [slotId] }).success).toBe(false);
});
