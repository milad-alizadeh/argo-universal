import { describe, expect, it } from 'vitest';
import { renderScope } from './story-render-scope.mts';

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
