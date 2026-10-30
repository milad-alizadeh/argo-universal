import {
  sessionActivitySlotId,
  sessionBarSlotId,
  sessionRowSlotId,
} from '@repo/contracts/plugins/wire';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import type { SlotVisibility } from '#features/settings';
import {
  itemsSlotEntry,
  type PluginLookup,
  readSlotItems,
  type ReadItem,
  type SlotReaderOn,
} from './slot-items';

const issues = 'issue-tracker';

const deploys = 'deploys';

const coverage = 'coverage';

const plug = iconSymbols.plug;

const ticket = { ...plug, sf: 'ticket' } as const;

const issueTracker = 'Issue tracker';

const identities = new Map([
  [issues, { name: issueTracker, icon: ticket }],
  [deploys, { name: 'Deploys', icon: plug }],
]);

// A Plugin the Server's list has not sent yet is named by its id, as the App names an unknown Plugin.
const lookup: PluginLookup = (pluginId) =>
  identities.get(pluginId) ?? { name: pluginId, icon: plug };

/*
 * This Device's choices for the Slot, as the Settings store works them out: the Plugins left on, and the one chosen
 * to write a Single-owner line.
 */
const on = (owner: string | null, hidden: string[] = []): SlotReaderOn => ({
  visibility: visibility(owner, hidden),
  lookup,
});

const visibility = (
  owner: string | null,
  hidden: string[],
): SlotVisibility => ({
  shows: (pluginId) => !hidden.includes(pluginId),
  owner,
});

const everyPluginOn = on(null);

const rowSlot = itemsSlotEntry(sessionRowSlotId);

const activitySlot = itemsSlotEntry(sessionActivitySlotId);

const reviewing = 'Awaiting review';

const deploying = 'Deploying preview';

const issueRef = 'Issue 412';

const ready = 'Preview ready';

const covered = '78%';

// What the Server sends for one Session's row: two items fit, a third waits behind "+N".
const rowItems = {
  items: [
    { pluginId: issues, item: { text: issueRef } },
    { pluginId: deploys, item: { text: 'Preview ready' } },
  ],
  overflow: [{ pluginId: coverage, item: { text: covered } }],
};

const activityLines = {
  items: [{ pluginId: issues, item: { text: reviewing } }],
  overflow: [{ pluginId: deploys, item: { text: deploying } }],
};

const textsOf = (items: readonly { item: { text: string } }[]): string[] =>
  items.map(({ item }) => item.text);

describe('reading an items Slot', () => {
  it('names each item’s Plugin, with its glyph, and keeps the Server’s split', () => {
    const reading = readSlotItems(rowSlot, rowItems, everyPluginOn);

    expect(reading.items).toEqual([
      {
        pluginId: issues,
        pluginName: issueTracker,
        pluginIcon: ticket,
        item: { text: issueRef },
      },
      {
        pluginId: deploys,
        pluginName: 'Deploys',
        pluginIcon: plug,
        item: { text: ready },
      },
    ]);

    expect(reading.overflow).toEqual([
      {
        pluginId: coverage,
        pluginName: coverage,
        pluginIcon: plug,
        item: { text: covered },
      },
    ]);
  });

  it('leaves out a Plugin this Device turned off, so the next in line moves up', () => {
    const reading = readSlotItems(rowSlot, rowItems, on(null, [issues]));

    expect(textsOf(reading.items)).toEqual([ready, covered]);
    expect(reading.overflow).toEqual([]);
  });

  it('reads nothing for a context no Plugin answered for', () => {
    expect(readSlotItems(rowSlot, undefined, everyPluginOn)).toEqual(nothing);
  });

  it('reads nothing from an answer the Slot’s own schema rejects', () => {
    const empty = {
      items: [{ pluginId: issues, item: { text: '' } }],
      overflow: [],
    };

    expect(readSlotItems(rowSlot, empty, everyPluginOn)).toEqual(nothing);
  });

  it('reads another Slot’s own item shape from the registry, with no reading code of its own', () => {
    const bar = {
      items: [
        {
          pluginId: issues,
          item: {
            text: 'Issue 412 · In review',
            action: { path: '/issues/412' },
          },
        },
      ],
      overflow: [],
    };

    const reading = readSlotItems(
      itemsSlotEntry(sessionBarSlotId),
      bar,
      everyPluginOn,
    );

    expect(reading.items).toEqual([
      {
        pluginId: issues,
        pluginName: issueTracker,
        pluginIcon: ticket,
        item: bar.items[0]?.item,
      },
    ]);
  });
});

const nothing = { items: [], overflow: [], owner: undefined };

const owner = (chosen: string | null): ReadItem<unknown> | undefined =>
  readSlotItems(activitySlot, activityLines, on(chosen)).owner;

describe('reading a Single-owner Slot', () => {
  it('picks the chosen Plugin’s line, wherever the Server put it', () => {
    expect(owner(deploys)).toEqual({
      pluginId: deploys,
      pluginName: 'Deploys',
      pluginIcon: plug,
      item: { text: deploying },
    });
  });

  it('leaves the line to Argo while no Plugin is chosen', () => {
    expect(owner(null)).toBeUndefined();
  });

  it('reads no owner from a Slot that has no Single-owner line', () => {
    expect(readSlotItems(rowSlot, rowItems, on(issues)).owner).toBeUndefined();
  });
});
