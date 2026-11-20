import {
  type SessionHeaderAction,
  sessionHeaderSlotId,
} from '@repo/contracts/plugins/declared-slots';
import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import type { PluginEntry } from '#features/plugins';
import type { SlotDetail } from './slot-detail';
import { toSlotPlugins } from './slot-plugin-list';

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

const settings: Pick<SlotDetail, 'slotId'> = { slotId: sessionRowSlotId };

const headerAction: SessionHeaderAction = {
  id: 'issue',
  label: 'Open linked issue',
  icon: { sf: 'ticket' },
  placement: 'header',
  target: { type: 'page', path: '/issues' },
};

const allShown = (): boolean => true;

describe('the Plugins on a Slot page', () => {
  it('lists each Plugin that fills the Slot, with its switch', () => {
    const plugins = toSlotPlugins(
      settings,
      [entry('coverage', [sessionRowSlotId]), entry('other', [])],
      allShown,
    );

    expect(plugins).toEqual([
      { pluginId: 'coverage', name: 'coverage', shown: true },
    ]);
  });

  it('lists a Plugin that declares Session header actions on the header page', () => {
    const tracker = {
      ...entry('tracker', []),
      manifest: {
        ...entry('tracker', []).manifest,
        contributes: {
          nav: [],
          declared: { [sessionHeaderSlotId]: [headerAction] },
        },
      },
    };

    expect(
      toSlotPlugins(
        { slotId: sessionHeaderSlotId },
        [tracker, entry('coverage', [sessionRowSlotId])],
        allShown,
      ),
    ).toEqual([{ pluginId: 'tracker', name: 'tracker', shown: true }]);
  });

  it('leaves out a Plugin that is turned off on the Server', () => {
    const off = { ...entry('status', [sessionRowSlotId]), enabled: false };

    expect(toSlotPlugins(settings, [off], allShown)).toEqual([]);
  });
});
