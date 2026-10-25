import { describe, expect, it } from 'vitest';
import { CapabilityRefusal } from './capability-refusal';
import { type Roots } from './plugin-access-rules';
import { allowWrite } from './plugin-write-rules';

const data = '/store/data';

const code = '/store/code';

const roots: Roots = {
  data,
  projects: ['/work/app', '/work/lib'],
  code,
};

const shown = 'asked/path';

const reasons = {
  project: `${shown} is in a Project; argo.fs never writes to a Project`,
  code: `${shown} is in the Plugin's code folder`,
  outside: `${shown} is outside the Plugin's data folder`,
  git: `${shown} would make a git repository`,
  database: `${shown} is the Plugin's database, which argo.storage owns`,
};

type Case = {
  name: string;
  target: string;
  reason: keyof typeof reasons;
  roots?: Roots;
};

const refusals: Case[] = [
  {
    name: 'a file in a Project',
    target: '/work/app/src/a.ts',
    reason: 'project',
  },
  { name: 'a Project folder itself', target: '/work/lib', reason: 'project' },
  {
    name: 'any registered Project, not only the first',
    target: '/work/lib/x',
    reason: 'project',
  },
  {
    name: 'a Project nested in the data folder',
    target: '/store/data/p/x',
    reason: 'project',
    roots: { ...roots, projects: ['/store/data/p'] },
  },
  {
    name: 'a file in the code folder',
    target: '/store/code/index.js',
    reason: 'code',
  },
  { name: 'the code folder itself', target: code, reason: 'code' },
  {
    name: 'code nested in the data folder',
    target: '/store/data/code/x',
    reason: 'code',
    roots: { ...roots, code: '/store/data/code' },
  },
  {
    name: 'a folder beside the data folder',
    target: '/store/data-other/x',
    reason: 'outside',
  },
  { name: 'a path above the data folder', target: '/store', reason: 'outside' },
  { name: 'an unrelated path', target: '/etc/passwd', reason: 'outside' },
  ...['plugin.db', 'plugin.db-wal', 'plugin.db-shm'].map((file): Case => ({
    name: `${file} in the data folder`,
    target: `/store/data/${file}`,
    reason: 'database',
  })),
  {
    name: 'a `.git` entry in the data folder',
    target: '/store/data/.git',
    reason: 'git',
  },
  {
    name: 'a file inside a nested `.git`',
    target: '/store/data/a/.git/config',
    reason: 'git',
  },
  {
    name: 'a `.git` in any letter case',
    target: '/store/data/.GiT/config',
    reason: 'git',
  },
  {
    name: 'a `HEAD` file, which makes a bare repository',
    target: '/store/data/HEAD',
    reason: 'git',
  },
  {
    name: 'a lower case `head` file',
    target: '/store/data/r/head',
    reason: 'git',
  },
  {
    name: 'a folder called `HEAD` and what is in it',
    target: '/store/data/HEAD/x',
    reason: 'git',
  },
];

const allowed: Omit<Case, 'reason'>[] = [
  { name: 'a file in the data folder', target: '/store/data/state.json' },
  { name: 'the data folder itself', target: data },
  { name: 'a nested file in the data folder', target: '/store/data/a/b/c.txt' },
  {
    name: 'a name that only starts like a parent',
    target: '/store/data/..cache',
  },
  {
    name: 'a name that only contains `.git`',
    target: '/store/data/.gitignore',
  },
  { name: 'a name that ends in `.git`', target: '/store/data/repo.git' },
  { name: 'a name that only starts with `head`', target: '/store/data/header' },
  {
    name: 'a data folder file when the code folder is unknown',
    target: '/store/data/a',
    roots: { ...roots, code: null },
  },
];

const write = (target: string, given: Roots, asked = shown): void =>
  allowWrite({ target, shown: asked }, given);

describe('allowWrite refuses, naming the rule that applies', () => {
  it.each(refusals)('$name', (found) => {
    const attempt = (): void => write(found.target, found.roots ?? roots);

    expect(attempt).toThrow(CapabilityRefusal);
    expect(attempt).toThrow(new CapabilityRefusal(reasons[found.reason]));
  });
});

describe('allowWrite allows', () => {
  it.each(allowed)('$name', (found) => {
    expect(() => write(found.target, found.roots ?? roots)).not.toThrow();
  });
});

describe('allowWrite precedence and wording', () => {
  it('names the path the Plugin asked for, never where a symlink leads', () => {
    expect(() => write('/work/app/secret', roots, 'link/to')).toThrow(
      'link/to is in a Project',
    );
  });

  it('gives the Project reason before the code reason', () => {
    const both = { ...roots, projects: [code] };

    expect(() => write('/store/code/x', both)).toThrow(reasons.project);
  });

  it('gives the code reason before the outside-data reason', () => {
    expect(() => write('/store/code/x', roots)).toThrow(reasons.code);
  });
});
