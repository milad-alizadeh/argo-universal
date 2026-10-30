import type { SessionBarItem } from '@repo/contracts/plugins/session-bar-item';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import { sessionBarLines } from './session-bar-lines';
import type { ReadItem, SlotReading } from './slot-items';

const previewReady = 'Preview ready';

const covered = '78% covered';

const read = (
  pluginId: string,
  pluginName: string,
  item: SessionBarItem,
): ReadItem<SessionBarItem> => ({
  pluginId,
  pluginName,
  pluginIcon: iconSymbols.plug,
  item,
});

const issues = read('issues', 'Issue tracker', {
  icon: { sf: 'ticket' },
  text: '#412 · In review',
  action: { path: '/issues/412' },
});

const deploys = read('deploys', 'Deploys', { text: previewReady });

const coverage = read('coverage', 'coverage', { text: covered });

// What the reader read for one Session: the line that fits, then the rest behind "+N".
const reading: SlotReading<SessionBarItem> = {
  items: [issues],
  overflow: [deploys, coverage],
  owner: undefined,
};

const nothingRead: SlotReading<SessionBarItem> = {
  items: [],
  overflow: [],
  owner: undefined,
};

describe('sessionBarLines', () => {
  it('shows the first Plugin with its page and lists the rest under their names', () => {
    expect(sessionBarLines(reading)).toEqual({
      shown: {
        pluginId: 'issues',
        pluginName: 'Issue tracker',
        icon: expect.objectContaining({ sf: 'ticket' }),
        text: '#412 · In review',
        path: '/issues/412',
      },
      hidden: [
        { pluginId: 'deploys', pluginName: 'Deploys', text: previewReady },
        { pluginId: 'coverage', pluginName: 'coverage', text: covered },
      ],
    });
  });

  it('gives the line to the next Plugin when the reader left the first out', () => {
    const lines = sessionBarLines({
      ...nothingRead,
      items: [deploys],
      overflow: [coverage],
    });

    expect(lines?.shown.text).toBe(previewReady);
    expect(lines?.hidden.map(({ text }) => text)).toEqual([covered]);
  });

  it('draws no bar when the reader read nothing', () => {
    expect(sessionBarLines(nothingRead)).toBeUndefined();
  });
});
