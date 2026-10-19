import { describe, expect, it } from 'vitest';
import { chooseTests, type ListedTest } from './verify-scope.mts';

const root = '/repo';

const rowFolder = `${root}/packages/client/src/sessions/session-row`;

const rowStory = `${rowFolder}/session-row.test.stories.tsx`;

const nestedStory = `${rowFolder}/compact/session-row-compact.test.stories.tsx`;

const feedStory = `${root}/packages/client/src/feed/feed.test.stories.tsx`;

const listed = (files: string[]): ListedTest[] =>
  files.map((file): ListedTest => ({
    file,
    projectName: 'storybook (chromium)',
  }));

describe('chooseTests', () => {
  it('runs every dependent test while they fit the limit', () => {
    const scope = chooseTests({
      listed: listed([rowStory, feedStory]),
      changed: [`${rowFolder}/session-row.tsx`],
      root,
      limit: 2,
    });

    expect(scope).toEqual({
      files: [rowStory, feedStory],
      dependents: 2,
      narrowed: false,
    });
  });

  it('narrows to the tests in and below the touched folders past the limit', () => {
    const scope = chooseTests({
      listed: listed([rowStory, nestedStory, feedStory]),
      changed: [`${rowFolder}/session-row.tsx`],
      root,
      limit: 2,
    });

    expect(scope).toEqual({
      files: [rowStory, nestedStory],
      dependents: 3,
      narrowed: true,
    });
  });

  it('selects nothing for a change at the repository root, such as the lockfile', () => {
    const scope = chooseTests({
      listed: listed([rowStory, feedStory]),
      changed: [`${root}/pnpm-lock.yaml`],
      root,
      limit: 1,
    });

    expect(scope.files).toEqual([]);
  });
});
