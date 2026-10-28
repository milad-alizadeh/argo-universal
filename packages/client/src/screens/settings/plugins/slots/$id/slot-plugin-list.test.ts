import {
  type SessionHeaderAction,
  sessionActivitySlotId,
  sessionHeaderSlotId,
  sessionRowSlotId,
} from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import type { PluginEntry } from '../../use-plugins';
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

const settings: Pick<SlotDetail, 'slotId' | 'ownerSlot'> = {
  slotId: sessionRowSlotId,
  ownerSlot: {
    slotId: sessionActivitySlotId,
    title: 'Activity line',
    argoSubtitle: '',
  },
};

const headerAction: SessionHeaderAction = {
  id: 'issue',
  label: 'Open linked issue',
  icon: { sf: 'ticket' },
  placement: 'header',
  target: { type: 'page', path: '/issues' },
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
    ).toEqual([
      {
        pluginId: 'tracker',
        name: 'tracker',
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
