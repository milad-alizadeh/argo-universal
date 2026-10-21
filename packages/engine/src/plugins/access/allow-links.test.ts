import { describe, expect, it } from 'vitest';
import { CapabilityRefusal } from './capability-refusal';
import { allowLinks, type Roots } from './plugin-access-rules';

const roots: Roots = {
  data: '/store/data',
  projects: ['/work/app'],
  code: '/store/code',
};

const shown = 'asked/path';

const dataFile = '/store/data/a';

type Case = { name: string; target: string; links: number };

const allowed: Case[] = [
  {
    name: 'a single link in the data folder',
    target: dataFile,
    links: 1,
  },
  { name: 'a single link outside every root', target: '/etc/hosts', links: 1 },
  { name: 'a file reporting no links', target: dataFile, links: 0 },
  {
    name: "a Project's several links, which are the user's own",
    target: '/work/app/a',
    links: 5,
  },
];

const refused: Case[] = [
  {
    name: 'a second link in the data folder',
    target: dataFile,
    links: 2,
  },
  { name: 'many links in the data folder', target: dataFile, links: 9 },
  {
    name: 'a second link in the code folder',
    target: '/store/code/a',
    links: 2,
  },
  { name: 'a second link outside every root', target: '/etc/hosts', links: 2 },
];

describe('allowLinks', () => {
  it.each(allowed)('allows $name', ({ target, links }) => {
    expect(() => allowLinks({ target, shown }, roots, links)).not.toThrow();
  });

  it.each(refused)('refuses $name', ({ target, links }) => {
    expect(() => allowLinks({ target, shown }, roots, links)).toThrow(
      new CapabilityRefusal(`${shown} has other hard links`),
    );
  });

  it('refuses with a CapabilityRefusal that names the asked path, not the target', () => {
    const subject = { target: '/store/data/real', shown: 'alias' };

    expect(() => allowLinks(subject, roots, 2)).toThrow(CapabilityRefusal);
    expect(() => allowLinks(subject, roots, 2)).toThrow(
      'alias has other hard links',
    );
  });
});
