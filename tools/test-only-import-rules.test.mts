import { describe, expect, it } from 'vitest';
import { testOnlyImportProblems } from './test-only-import-rules.mts';

const driver = `import { settleLayout } from '@repo/kit/mocks/story-layout';`;

describe('shipped code', (): void => {
  it.each([
    ['packages/kit/src/list.tsx', `import { page } from 'vitest/browser';`],
    ['packages/client/src/features/a/a.tsx', driver],
    [
      'packages/kit/src/list.tsx',
      `import { settleLayout } from '#mocks/story-layout';`,
    ],
  ])('%s may not import a test-only module', (file, source): void => {
    expect(testOnlyImportProblems(file, source)).toEqual([
      expect.stringMatching(/shipped code imports/),
    ]);
  });

  it.each([
    'packages/kit/src/list.test.stories.tsx',
    'packages/client/src/features/a/a.mocks.tsx',
    'packages/kit/mocks/story-layout.ts',
    'packages/kit/src/list-look-fixtures.ts',
  ])('%s is not shipped', (file): void => {
    expect(testOnlyImportProblems(file, driver)).toEqual([]);
  });
});
