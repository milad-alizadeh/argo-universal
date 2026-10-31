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
    expect(nothingChecked([])).toBe('nothing changed since main.');
  });

  it('says a change it does not read was not checked and is not a pass', (): void => {
    const message = nothingChecked(['docs/agents/storybook.md']);

    expect(message).toContain('nothing checked');
    expect(message).toContain('docs/agents/storybook.md');
    expect(message).toContain('not a pass');
    expect(message).not.toContain('nothing changed');
  });

  it('names the first paths and elides the rest', (): void => {
    const message = nothingChecked(['a.md', 'b.md', 'c.md', 'd.md']);

    expect(message).toContain('a.md, b.md, c.md, ...');
    expect(message).not.toContain('d.md');
  });
});
