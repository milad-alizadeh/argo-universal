import { sessionBarSlotId } from '@repo/contracts/plugins/wire';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import type { SlotVisibility } from '#features/settings';
import {
  itemsSlotEntry,
  type PluginLookup,
  readSlotItems,
  sentFor,
  slotReader,
} from './slot-items';

const slot = itemsSlotEntry(sessionBarSlotId);

const lookup: PluginLookup = (pluginId) => ({
  name: pluginId,
  icon: iconSymbols.plug,
});

const allOn: SlotVisibility = { shows: () => true };

const noneOn: SlotVisibility = { shows: () => false };

const issues = 'issues';

const deploys = 'deploys';

const answers = {
  s1: {
    items: [{ pluginId: issues, item: { text: 'In review' } }],
    overflow: [{ pluginId: deploys, item: { text: 'Ready' } }],
  },
};

const noContext = undefined;

// The Plugins one context shows, through the reader the hook builds from the saved choices and the override.
const shown = (
  key: string | undefined,
  saved: SlotVisibility,
  override?: SlotVisibility,
): string[] => {
  const reading = readSlotItems(
    slot,
    sentFor(answers, key),
    slotReader(saved, override, lookup),
  );

  return [...reading.items, ...reading.overflow].map(
    ({ pluginId }) => pluginId,
  );
};

describe('reading one context', () => {
  it('reads an empty Slot while there is no context to read', () => {
    expect(shown(noContext, allOn)).toEqual([]);
  });

  it('reads an empty Slot while the Server has sent nothing for the context', () => {
    expect(shown('another', allOn)).toEqual([]);
  });

  it("reads the context's answer", () => {
    expect(shown('s1', allOn)).toEqual([issues, deploys]);
  });

  it('lets the choices passed in win over the saved ones', () => {
    expect(shown('s1', noneOn, allOn)).toEqual([issues, deploys]);
    expect(shown('s1', allOn, noneOn)).toEqual([]);
  });

  it('lets a hidden Plugin make room for the next in line', () => {
    const noIssues: SlotVisibility = {
      shows: (pluginId) => pluginId !== issues,
    };

    expect(shown('s1', noIssues)).toEqual([deploys]);
  });
});
