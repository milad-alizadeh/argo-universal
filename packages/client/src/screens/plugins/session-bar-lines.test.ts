import { describe, expect, it } from 'vitest';
import type { SlotVisibility } from '#features/settings';
import { sessionBarLines } from './session-bar-lines';

const issues = 'issues';

const deploys = 'deploys';

const coverage = 'coverage';

const previewReady = 'Preview ready';

const covered = '78% covered';

const names = new Map([
  [issues, 'Issue tracker'],
  [deploys, 'Deploys'],
]);

const pluginName = (pluginId: string): string =>
  names.get(pluginId) ?? pluginId;

const answer = {
  items: [
    {
      pluginId: issues,
      item: {
        icon: { sf: 'ticket' as const },
        text: '#412 · In review',
        action: { path: '/issues/412' },
      },
    },
  ],
  overflow: [
    { pluginId: deploys, item: { text: previewReady } },
    { pluginId: coverage, item: { text: covered } },
  ],
};

// This Device's choices: every Plugin left on but the hidden ones.
const hiding = (...hidden: string[]): SlotVisibility => ({
  shows: (pluginId) => !hidden.includes(pluginId),
  owner: null,
});

const allShown = hiding();

describe('sessionBarLines', () => {
  it('shows the first Plugin with its page and lists the rest under their names', () => {
    expect(sessionBarLines(answer, allShown, pluginName)).toEqual({
      shown: {
        pluginId: issues,
        pluginName: 'Issue tracker',
        icon: expect.objectContaining({ sf: 'ticket' }),
        text: '#412 · In review',
        path: '/issues/412',
      },
      hidden: [
        { pluginId: deploys, pluginName: 'Deploys', text: previewReady },
        { pluginId: coverage, pluginName: coverage, text: covered },
      ],
    });
  });

  it('gives the line to the next Plugin when this Device hides the first', () => {
    const lines = sessionBarLines(answer, hiding(issues), pluginName);

    expect(lines?.shown.text).toBe(previewReady);
    expect(lines?.hidden.map(({ text }) => text)).toEqual([covered]);
  });

  it('draws no bar when no Plugin answers or every one is hidden', () => {
    expect(
      sessionBarLines({ items: [], overflow: [] }, allShown, pluginName),
    ).toBeUndefined();
    expect(
      sessionBarLines(answer, hiding(issues, deploys, coverage), pluginName),
    ).toBeUndefined();
  });
});
