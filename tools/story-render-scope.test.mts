import { describe, expect, it } from 'vitest';
import { capScope, renderScope } from './story-render-scope.mts';

const root = '/repo';

const row = 'packages/kit/src/primitives/lists/row/row.stories.tsx';

describe('renderScope', () => {
  it('draws the story files whose imports reach the change', () => {
    const scope = renderScope({
      changed: ['packages/kit/src/primitives/lists/row/row.tsx'],
      dependents: [`${root}/${row}`, `${root}/${row}`],
      root,
    });

    expect(scope).toEqual({ all: false, files: new Set([row]) });
  });

  it('draws nothing when no story reaches the change', () => {
    const scope = renderScope({
      changed: ['packages/engine/src/feed/feed.ts'],
      dependents: [],
      root,
    });

    expect(scope).toEqual({ all: false, files: new Set() });
  });

  it.each([
    'apps/storybook/.storybook/preview.tsx',
    'tooling/uniwind/theme.css',
    'packages/kit/src/global.css',
    'packages/kit/package.json',
    'pnpm-lock.yaml',
    'tools/story-render-rules.mts',
    'tools/check-story-renders.mts',
  ])('draws everything when %s changes', (changed) => {
    expect(renderScope({ changed: [changed], dependents: [], root })).toEqual({
      all: true,
    });
  });
});

describe('capScope', () => {
  const near = 'packages/kit/src/primitives/lists/row/row-group.stories.tsx';

  const far =
    'packages/client/src/screens/sessions/session-list-view.stories.tsx';

  const changed = ['packages/kit/src/primitives/lists/row/row.tsx'];

  it('keeps every reached file within the limit', () => {
    expect(
      capScope({ files: [row, near, far], changed, root, limit: 3 }).files,
    ).toEqual([row, near, far]);
  });

  it('keeps only the files in the touched folders past the limit', () => {
    expect(
      capScope({ files: [row, near, far], changed, root, limit: 2 }),
    ).toEqual({ files: [row, near], dependents: 3, narrowed: true });
  });
});
