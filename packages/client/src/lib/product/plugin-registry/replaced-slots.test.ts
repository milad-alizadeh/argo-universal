import type { PluginList } from '@repo/contracts/plugins';
import {
  messageSlotId,
  toolCallSlotId,
} from '@repo/contracts/plugins/replaceable';
import { describe, expect, it } from 'vitest';
import { replacedSlots } from './replaced-slots';

type Contributes = PluginList['plugins'][number]['manifest']['contributes'];

const plugin = (
  contributes: Partial<Contributes>,
  enabled = true,
): PluginList['plugins'][number] => ({
  manifest: {
    id: 'fixture',
    name: 'Fixture',
    version: '1.0.0',
    engines: { argo: '*' },
    main: 'index.ts',
    icon: {},
    contributes: { nav: [], ...contributes },
  },
  firstParty: false,
  enabled,
  state: 'running',
  hanging: false,
  error: null,
});

const list = (...plugins: PluginList['plugins']): PluginList => ({
  plugins,
  errors: [],
});

const rendersMessages = {
  hooks: ['ui.render'],
  renders: [messageSlotId],
} satisfies Partial<Contributes>;

describe('replacedSlots', () => {
  it('names no Slot when no Plugin renders one', () => {
    expect(replacedSlots(list())).toEqual([]);
    expect(replacedSlots(list(plugin({ hooks: ['tool.check'] })))).toEqual([]);
  });

  it('names only the Slots an enabled Plugin renders', () => {
    expect(replacedSlots(list(plugin(rendersMessages)))).toEqual([
      messageSlotId,
    ]);
    expect(replacedSlots(list(plugin(rendersMessages, false)))).toEqual([]);
  });

  it('names each Slot once however many Plugins render it', () => {
    expect(
      replacedSlots(
        list(
          plugin(rendersMessages),
          plugin({
            hooks: ['ui.render'],
            renders: [toolCallSlotId, messageSlotId],
          }),
        ),
      ),
    ).toEqual([toolCallSlotId, messageSlotId]);
  });
});
