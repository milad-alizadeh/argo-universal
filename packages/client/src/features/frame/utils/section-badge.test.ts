import { describe, expect, it } from 'vitest';
import { sectionBadge } from './section-badge';

const pluginBadges = [
  { pluginId: 'issue-tracker', id: 'issues', count: 12 },
  { pluginId: 'example', id: 'example', count: 150 },
];

describe('sectionBadge', () => {
  it('counts Sessions that need attention on Sessions', () => {
    expect(sectionBadge('sessions', 3, pluginBadges).count).toBe(3);
  });

  it('shows nothing on Settings', () => {
    expect(sectionBadge('settings', 3, pluginBadges).count).toBe(0);
  });

  it('counts a Plugin nav item by its Plugin id and nav id', () => {
    expect(
      sectionBadge('plugins/issue-tracker/issues', 3, pluginBadges).count,
    ).toBe(12);
  });

  it('keeps the real count so the badge caps it', () => {
    expect(sectionBadge('plugins/example/example', 0, pluginBadges).count).toBe(
      150,
    );
  });

  it('shows nothing for a Plugin nav item that set no badge', () => {
    expect(sectionBadge('plugins/other/nav', 3, pluginBadges).count).toBe(0);
  });
});
