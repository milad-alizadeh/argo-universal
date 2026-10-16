import { describe, expect, it } from 'vitest';
import { isPage, sectionOf, sectionOrder } from './sections';

const sectionCases: [string | undefined, string][] = [
  ['/sessions', 'sessions'],
  ['/sessions/new', 'sessions'],
  ['/sessions/[id]', 'sessions'],
  ['/issues', 'sessions'],
  ['/atlas', 'sessions'],
  ['/settings', 'settings'],
  ['/settings/accounts', 'settings'],
  ['/settings/projects/example-project', 'settings'],
  ['/settings/agents/new', 'settings'],
  ['settings', 'settings'],
  ['/', 'sessions'],
  ['index', 'sessions'],
  [undefined, 'sessions'],
  ['/toString', 'sessions'],
  ['/constructor', 'sessions'],
];

describe('sectionOf', () => {
  it.each(sectionCases)('puts %s in %s', (path, section) => {
    expect(sectionOf(path)).toBe(section);
  });
});

describe('isPage', () => {
  it.each(['/sessions', '/settings'])(
    'reads the list %s as no page',
    (path) => {
      expect(isPage(path)).toBe(false);
    },
  );

  it.each(['/sessions/new', '/settings/accounts', '/settings/agents/codex'])(
    'reads %s as a page',
    (path) => {
      expect(isPage(path)).toBe(true);
    },
  );
});

describe('sectionOrder', () => {
  it('lists the sections top to bottom', () => {
    expect(sectionOrder).toEqual(['sessions', 'settings']);
  });
});
