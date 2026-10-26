import {
  sessionActivitySlotId,
  sessionRowSlotId,
} from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import type { PluginEntry } from '../use-plugins';
import { toSlotPlugins } from './slot-plugin-list';
import type { SlotSettings } from './slot-settings';

const entry = (
  id: string,
  slots: PluginEntry['manifest']['contributes']['slots'],
): PluginEntry => ({
  manifest: {
    id,
    name: id,
    version: '1.0.0',
    engines: { argo: '*' },
    main: 'index.ts',
    icon: {},
    contributes: { nav: [], slots },
  },
  firstParty: false,
  enabled: true,
  state: 'running',
  hanging: false,
  error: null,
});

const settings: Pick<SlotSettings, 'slotId' | 'ownerSlot'> = {
  slotId: sessionRowSlotId,
  ownerSlot: {
    slotId: sessionActivitySlotId,
    title: 'Activity line',
    argoSubtitle: '',
  },
};

const allShown = (): boolean => true;

describe('the Plugins on a Slot page', () => {
  it('lists a Plugin that only asks for the line, with no switch of its own', () => {
    const plugins = toSlotPlugins(
      settings,
      [
        entry('status', [sessionActivitySlotId]),
        entry('coverage', [sessionRowSlotId]),
        entry('other', []),
      ],
      allShown,
    );

    expect(plugins).toEqual([
      {
        pluginId: 'status',
        name: 'status',
        fills: false,
        shown: true,
        asks: true,
      },
      {
        pluginId: 'coverage',
        name: 'coverage',
        fills: true,
        shown: true,
        asks: false,
      },
    ]);
  });

  it('leaves out a Plugin that is turned off on the Server', () => {
    const off = { ...entry('status', [sessionRowSlotId]), enabled: false };

    expect(toSlotPlugins(settings, [off], allShown)).toEqual([]);
  });
});
