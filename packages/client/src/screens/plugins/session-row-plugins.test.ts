import type {
  SessionActivityItem,
  SessionRowItem,
} from '@repo/contracts/plugins/wire';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import { sessionRowPlugins } from './session-row-plugins';
import type { ReadItem, SlotReading } from './slot-items';

const issueTracker = 'Issue tracker';

const ticket = { ...iconSymbols.plug, sf: 'ticket' } as const;

const issue: ReadItem<SessionRowItem> = {
  pluginId: 'issues',
  pluginName: issueTracker,
  pluginIcon: ticket,
  item: { text: 'Issue 412' },
};

const coverage: ReadItem<SessionRowItem> = {
  pluginId: 'coverage',
  pluginName: 'Coverage',
  pluginIcon: iconSymbols.plug,
  item: { text: '78%' },
};

const nothingRead = { items: [], overflow: [], owner: undefined };

const noLines: SlotReading<SessionActivityItem> = nothingRead;

describe('a Session row’s Plugin content', () => {
  it('keeps each item’s Plugin name, behind "+N" too, and keeps the line Argo’s when no Plugin writes it', () => {
    expect(
      sessionRowPlugins(
        { items: [issue], overflow: [coverage], owner: undefined },
        noLines,
      ),
    ).toEqual({
      items: [
        {
          key: 'issues:0',
          pluginId: 'issues',
          pluginName: issueTracker,
          item: issue.item,
        },
      ],
      more: [
        {
          key: 'coverage:0',
          pluginId: 'coverage',
          pluginName: 'Coverage',
          item: coverage.item,
        },
      ],
      activity: undefined,
    });
  });

  it('leads the chosen Plugin’s Activity line with that Plugin’s glyph', () => {
    const owner: ReadItem<SessionActivityItem> = {
      pluginId: 'issues',
      pluginName: issueTracker,
      pluginIcon: ticket,
      item: { text: 'In review' },
    };

    expect(sessionRowPlugins(nothingRead, { ...noLines, owner })).toMatchObject(
      { activity: { text: 'In review', icon: ticket } },
    );
  });

  it('adds nothing to a row no Plugin adds to', () => {
    expect(sessionRowPlugins(nothingRead, noLines)).toBeUndefined();
  });
});
