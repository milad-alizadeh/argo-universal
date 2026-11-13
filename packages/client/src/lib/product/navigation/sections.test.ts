import { describe, expect, it } from 'vitest';
import { isPage, listAbove, sectionOf, sectionOrder } from './sections';

const issues = 'plugins/issue-tracker/issues';

const sectionCases: [string | undefined, string][] = [
  ['/sessions', 'sessions'],
  ['/sessions/new', 'sessions'],
  ['/sessions/[id]', 'sessions'],
  ['/issues', 'sessions'],
  ['/atlas', 'sessions'],
  ['/settings', 'settings'],
  ['/settings/accounts', 'settings'],
  ['/settings/projects/example-project', 'settings'],
  ['settings', 'settings'],
  ['/', 'sessions'],
  ['index', 'sessions'],
  [undefined, 'sessions'],
  ['/toString', 'sessions'],
  ['/constructor', 'sessions'],
  ['/plugins', 'sessions'],
  ['/plugins/example', 'sessions'],
  ['/plugins/example/example', 'plugins/example/example'],
  [`/${issues}/42`, issues],
  [issues, issues],
];

describe('sectionOf', () => {
  it.each(sectionCases)('puts %s in %s', (path, section) => {
    expect(sectionOf(path)).toBe(section);
  });
});

describe('isPage', () => {
  it.each(['/sessions', '/settings', '/plugins/example/example'])(
    'reads the list %s as no page',
    (path) => {
      expect(isPage(path)).toBe(false);
    },
  );

  it.each([
    '/sessions/new',
    '/settings/accounts',
    '/settings/agents/codex',
    `/${issues}/42`,
  ])('reads %s as a page', (path) => {
    expect(isPage(path)).toBe(true);
  });
});

describe('listAbove', () => {
  it.each([
    ['/settings/plugins/slots/x', 'settings'],
    ['/sessions/s-1', 'sessions'],
    [`/${issues}/7`, issues],
  ])('puts %s under the %s list', (path, section) => {
    expect(listAbove(path)).toBe(section);
  });

  it('puts nothing above a list', () => {
    expect(listAbove('/settings')).toBeNull();
  });
});

describe('sectionOrder', () => {
  it('lists the sections top to bottom', () => {
    expect(sectionOrder).toEqual(['sessions', 'settings']);
  });
});
