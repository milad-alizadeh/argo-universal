import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chooseTests, nothingChecked } from './verify-scope.mts';

const root = '/repo';

const rowFolder = 'packages/client/src/sessions/session-row';

const rowStory = `${root}/${rowFolder}/session-row.test.stories.tsx`;

const nestedStory = `${root}/${rowFolder}/compact/session-row-compact.test.stories.tsx`;

const feedStory = `${root}/packages/client/src/feed/feed.test.stories.tsx`;

const rowSource = `${rowFolder}/session-row.tsx`;

describe('chooseTests', () => {
  it('runs every dependent test while they fit the limit', () => {
    const scope = chooseTests({
      tests: [rowStory, feedStory],
      changed: [rowSource],
      root,
      limit: 2,
    });

    expect(scope).toEqual({
      files: [rowStory, feedStory],
      dependents: 2,
      narrowed: false,
    });
  });

  it('counts a test file listed by two projects once', () => {
    const scope = chooseTests({
      tests: [rowStory, rowStory],
      changed: [rowSource],
      root,
      limit: 2,
    });

    expect(scope.files).toEqual([rowStory]);
  });

  it('narrows to the tests in and below the touched folders past the limit', () => {
    const scope = chooseTests({
      tests: [rowStory, nestedStory, feedStory],
      changed: [rowSource],
      root,
      limit: 2,
    });

    expect(scope).toEqual({
      files: [rowStory, nestedStory],
      dependents: 3,
      narrowed: true,
    });
  });

  it('keeps changed stories and plain tests when related stories exceed the budget', () => {
    const plain = `${root}/${rowFolder}/row.test.ts`;
    const changedStory = path.relative(root, rowStory);

    const scope = chooseTests({
      root,
      changed: [changedStory],
      limit: 1,
      tests: [
        rowStory,
        nestedStory,
        plain,
        `${root}/${rowFolder}/z.stories.tsx`,
      ],
    });

    expect(scope.files).toEqual([rowStory, nestedStory, plain]);
  });

  it('includes a directly changed Story test missing from the discovered graph', () => {
    const scope = chooseTests({
      tests: [],
      changed: [path.relative(root, rowStory)],
      root,
    });

    expect(scope.files).toEqual([rowStory]);
  });

  it('selects nothing for a change at the repository root, such as the lockfile', () => {
    const scope = chooseTests({
      tests: [rowStory, feedStory],
      changed: ['pnpm-lock.yaml'],
      root,
      limit: 1,
    });

    expect(scope.files).toEqual([]);
  });
});

describe('nothingChecked', (): void => {
  it('calls an empty change empty', (): void => {
    expect(nothingChecked([], 'main')).toBe('nothing changed since main.');
  });

  it('says a change it does not read was not checked and is not a pass', (): void => {
    const message = nothingChecked(['docs/agents/storybook.md'], 'main');

    expect(message).toContain('nothing checked');
    expect(message).toContain('docs/agents/storybook.md');
    expect(message).toContain('not a pass');
    expect(message).not.toContain('nothing changed');
  });

  it('names the first paths and elides the rest', (): void => {
    const message = nothingChecked(['a.md', 'b.md', 'c.md', 'd.md'], 'main');

    expect(message).toContain('a.md, b.md, c.md, ...');
    expect(message).not.toContain('d.md');
  });
});
