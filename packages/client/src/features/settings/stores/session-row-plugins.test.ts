import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import { type PluginOf, sessionRowPlugins } from './session-row-plugins';
import { slotVisibility } from './slot-visibility';

const ticket = { sf: 'ticket', material: 'confirmation_number' } as const;

const plugins = new Map([
  ['issues', { name: 'Issue tracker', icon: ticket }],
  ['deploys', { name: 'Deploys', icon: iconSymbols.plug }],
  ['coverage', { name: 'Coverage', icon: iconSymbols.plug }],
]);

const pluginOf: PluginOf = (pluginId) =>
  plugins.get(pluginId) ?? { name: pluginId, icon: iconSymbols.plug };

const issue = `Issue ${412}`;

// What the Server sends for one Session: two items fit on a phone-sized limit, one more behind "+N".
const answer = {
  items: {
    items: [
      { pluginId: 'issues', item: { text: issue } },
      { pluginId: 'deploys', item: { text: 'Preview ready' } },
    ],
    overflow: [{ pluginId: 'coverage', item: { text: '78%' } }],
  },
  lines: {
    items: [{ pluginId: 'issues', item: { text: 'In review' } }],
    overflow: [{ pluginId: 'deploys', item: { text: 'Deploying' } }],
  },
};

const noAnswer = {
  items: { items: [], overflow: [] },
  lines: { items: [], overflow: [] },
};

const rowFor = (
  hidden: string[],
  owner: string | null,
  sent = answer,
): ReturnType<typeof sessionRowPlugins> =>
  sessionRowPlugins(sent, slotVisibility({ hidden, owner }), pluginOf);

const shownTexts = (hidden: string[]): string[] =>
  rowFor(hidden, null)?.items.map(({ item }) => item.text) ?? [];

describe('a Session row’s Plugin content on this Device', () => {
  it('shows what fits, keeps the rest behind "+N" with each Plugin’s name, and leaves the line to Argo', () => {
    const row = rowFor([], null);

    expect(shownTexts([])).toEqual([issue, 'Preview ready']);
    expect(row?.more).toEqual([
      {
        key: 'coverage:0',
        pluginId: 'coverage',
        pluginName: 'Coverage',
        item: { text: '78%' },
      },
    ]);
    expect(row?.activity).toBeUndefined();
  });

  it('lets the next Plugin in line take a hidden Plugin’s place, and leaves nothing behind "+N"', () => {
    expect(shownTexts(['deploys'])).toEqual([issue, '78%']);
    expect(rowFor(['deploys'], null)?.more).toEqual([]);
  });

  it('writes the chosen Plugin’s Activity line, even one past what fits, led by that Plugin’s glyph', () => {
    expect(rowFor([], 'deploys')?.activity).toEqual({
      text: 'Deploying',
      icon: iconSymbols.plug,
    });
    expect(rowFor([], 'issues')?.activity).toEqual({
      text: 'In review',
      icon: ticket,
    });
  });

  it('gives the line back to Argo when the chosen Plugin is off or has no answer for the Session', () => {
    expect(rowFor(['issues'], 'issues')?.activity).toBeUndefined();
    expect(rowFor([], 'coverage')?.activity).toBeUndefined();
  });

  it('adds nothing to a row no Plugin answers for', () => {
    expect(rowFor([], 'issues', noAnswer)).toBeUndefined();
  });
});
