import type { SessionRowItem } from '@repo/contracts/plugins/wire';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import { sessionRowPlugins } from './session-row-plugins';
import type { ReadItem } from './slot-items';

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

describe('a Session row’s Plugin content', () => {
  it('keeps each item’s Plugin name, behind "+N" too', () => {
    expect(
      sessionRowPlugins({ items: [issue], overflow: [coverage] }),
    ).toMatchObject({
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
    });
  });

  it('adds nothing to a row no Plugin adds to', () => {
    expect(sessionRowPlugins({ items: [], overflow: [] })).toBeUndefined();
  });
});
