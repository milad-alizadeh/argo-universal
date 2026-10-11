import { describe, expect, it } from 'vitest';
import { suffixProblems } from './test-suffix-rules.mts';

const unitFile = 'packages/engine/src/a.test.ts';
const integrationFile = 'packages/engine/src/a.integration.test.ts';
const touches = /touches real infrastructure/;
const database = `import { openDatabase } from '@repo/db';`;

const check = (file: string, files: Record<string, string>): string[] =>
  suffixProblems(file, new Map(Object.entries(files)));

describe('a *.test file', (): void => {
  it.each([
    ['SQLite', database],
    ['the filesystem', `import { mkdtempSync } from 'node:fs';`],
    ['a child process', `import { spawn } from 'node:child_process';`],
    ['the network', `import { createServer } from 'node:http';`],
    ['git', `import { initTestRepository } from '@repo/mocks/git/repo';`],
  ])('may not open %s', (_, source): void => {
    expect(check(unitFile, { [unitFile]: source })).toEqual([
      expect.stringMatching(touches),
    ]);
  });

  it('may not reach a resource through a mock module', (): void => {
    const problems = check(unitFile, {
      [unitFile]: `import { start } from '#mocks/host';`,
      'packages/engine/mocks/host.ts': `import { open } from './storage';`,
      'packages/engine/mocks/storage.ts': `import { rmSync } from 'node:fs';`,
    });
    expect(problems).toEqual([
      expect.stringMatching(/mocks\/storage\.ts imports node:fs/),
    ]);
  });

  it('passes when its mock modules stay in memory', (): void => {
    const problems = check(unitFile, {
      [unitFile]: `import { wire } from '#mocks/wire';\nimport type { Database } from '@repo/db';`,
      'packages/engine/mocks/wire.ts': `export const wire = 1;`,
    });
    expect(problems).toEqual([]);
  });
});

it('leaves *.integration.test files alone', (): void => {
  expect(check(integrationFile, { [integrationFile]: database })).toEqual([]);
});
