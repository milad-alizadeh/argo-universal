import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it } from 'vitest';
import { type PluginLookup, sessionRowPlugins } from './session-row-plugins';

const ticket = { sf: 'ticket', material: 'confirmation_number' } as const;

const plugins = new Map([
  ['issues', { name: 'Issue tracker', icon: ticket }],
  ['coverage', { name: 'Coverage', icon: iconSymbols.plug }],
]);

const lookup: PluginLookup = (pluginId) =>
  plugins.get(pluginId) ?? { name: pluginId, icon: iconSymbols.plug };

const issue = { pluginId: 'issues', item: { text: `Issue ${412}` } };

const coverage = { pluginId: 'coverage', item: { text: '78%' } };

describe('a Session row’s Plugin content', () => {
  it('names each item’s Plugin, behind "+N" too, and keeps the line Argo’s when no Plugin writes it', () => {
    expect(
      sessionRowPlugins({ items: [issue], overflow: [coverage] }, lookup),
    ).toEqual({
      items: [{ key: 'issues:0', pluginName: 'Issue tracker', ...issue }],
      more: [{ key: 'coverage:0', pluginName: 'Coverage', ...coverage }],
      activity: undefined,
    });
  });

  it('leads the chosen Plugin’s Activity line with that Plugin’s glyph', () => {
    const activity = { pluginId: 'issues', text: 'In review' };

    expect(
      sessionRowPlugins({ items: [], overflow: [], activity }, lookup),
    ).toMatchObject({ activity: { text: 'In review', icon: ticket } });
  });

  it('adds nothing to a row no Plugin adds to', () => {
    expect(
      sessionRowPlugins({ items: [], overflow: [] }, lookup),
    ).toBeUndefined();
  });
});
