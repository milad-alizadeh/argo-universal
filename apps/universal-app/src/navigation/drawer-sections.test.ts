import type { Section } from '@repo/client';
import { describe, expect, it } from 'vitest';
import { sectionPick } from './drawer-sections';

// A narrow drawer showing Settings, with each section as a drawer route.
const showingSettings = {
  index: 3,
  routes: ['sessions', 'issues', 'atlas', 'settings'].map((name) => ({
    key: `${name}-key`,
    name,
  })),
};

describe('sectionPick', () => {
  it('closes the drawer when the shown section is picked', () => {
    expect(sectionPick(showingSettings, 'settings')).toBe('close');
  });

  it.each<[Section, string]>([
    ['sessions', 'sessions-key'],
    ['issues', 'issues-key'],
    ['atlas', 'atlas-key'],
  ])('opens %s on its own drawer route, keeping its pages', (section, key) => {
    expect(sectionPick(showingSettings, section)).toEqual({
      key,
      name: section,
    });
  });
});
