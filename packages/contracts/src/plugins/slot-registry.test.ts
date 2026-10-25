import { expect, it } from 'vitest';
import { PluginManifest } from './plugins';
import {
  AddOnlySlotId,
  PluginSlotInput,
  ReplaceableSlotId,
  SlotId,
  slotContentRule,
  slotRegistry,
} from './wire';

const contexts = {
  'argo/project/details/v1': { projectId: 'argo' },
  'argo/session/row/v1': {
    sessionId: 'session',
    projectId: 'argo',
    branch: null,
  },
};

it('keeps every Slot id', () => {
  expect(slotRegistry.map(({ id, kind }) => [id, kind])).toEqual([
    ['argo/project/details/v1', 'add-only'],
    ['argo/session/row/v1', 'add-only'],
    ['argo/feed/tool-call/v1', 'replaceable'],
    ['argo/feed/message/v1', 'replaceable'],
    ['argo/composer/above/v1', 'replaceable'],
  ]);
});

it.each(Object.entries(contexts))(
  'parses the context of add-only Slot %s',
  (slotId, context) => {
    expect(PluginSlotInput.parse({ slotId, context })).toEqual({
      slotId,
      context,
    });
    expect(AddOnlySlotId.safeParse(slotId).success).toBe(true);
    expect(ReplaceableSlotId.safeParse(slotId).success).toBe(false);
  },
);

it.each(['argo/feed/tool-call/v1', 'argo/composer/above/v1'])(
  'takes no context for Replaceable Slot %s',
  (slotId) => {
    expect(
      PluginSlotInput.safeParse({ slotId, context: { projectId: 'argo' } })
        .success,
    ).toBe(false);
    expect(AddOnlySlotId.safeParse(slotId).success).toBe(false);
    expect(SlotId.parse(slotId)).toBe(slotId);
  },
);

it('lets a manifest declare add-only and Replaceable Slots', () => {
  const slots = slotRegistry.map(({ id }) => id);

  const manifest = PluginManifest.parse({
    id: 'slots',
    name: 'Slots',
    version: '1.0.0',
    engines: { argo: '>=0.0.0' },
    main: 'index.js',
    icon: { material: 'extension' },
    capabilities: [],
    contributes: { nav: [], slots },
  });

  expect(manifest.contributes.slots).toEqual(slots);
});

it('names the parts each Slot accepts', () => {
  expect(slotContentRule('argo/project/details/v1')).toBe('tree');

  expect(slotContentRule('argo/session/row/v1')).toEqual({
    part: 'ListItem',
    slot: 'meta',
  });
});
