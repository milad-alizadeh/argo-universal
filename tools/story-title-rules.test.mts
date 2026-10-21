import { describe, expect, it } from 'vitest';
import {
  derivedStoryTitle,
  duplicateTitleProblems,
  type StoryFile,
  storyTitleProblems,
} from './story-title-rules.mts';

const src = 'packages/client/src';

const kit = 'packages/kit/src';

const meta = (title: string): string =>
  `const meta = {\n  title: '${title}',\n} satisfies Meta;`;

describe('a story title', (): void => {
  it.each([
    [
      `${kit}/primitives/lists/grouped-list-item/grouped-list-item.stories.tsx`,
      'Design System/Primitives/Lists/GroupedListItem',
    ],
    // A file named after its folder plus an aspect draws that aspect of the component.
    [
      `${kit}/primitives/lists/list/list-tiles.stories.tsx`,
      'Design System/Primitives/Lists/List/Tiles',
    ],
    // A file in a category folder with no folder of its own takes the category and its own name.
    [
      `${kit}/primitives/visual/svg.stories.tsx`,
      'Design System/Primitives/Visual/Svg',
    ],
    [`${kit}/symbols/icon.stories.tsx`, 'Design System/Icon'],
    [
      `${src}/lib/product/screen/screen.stories.tsx`,
      'Design System/Patterns/Screen',
    ],
    [
      `${src}/lib/product/stacked-summary.stories.tsx`,
      'Design System/Patterns/StackedSummary',
    ],
    [
      `${src}/features/feed/components/edit-row/edit-row.stories.tsx`,
      'Feed/EditRow',
    ],
    [`${src}/features/frame/scaffold/scaffold.stories.tsx`, 'Frame/Scaffold'],
    // A view whose name is not a route's own is a component, not a screen.
    [
      `${src}/features/feed/components/diff-view/diff-view.stories.tsx`,
      'Feed/DiffView',
    ],
    // Exception 1: a screen's last segment is the page title a reader sees.
    [
      `${src}/screens/sessions/$id/session-new-view.stories.tsx`,
      'Screens/Sessions/New Session',
    ],
    [
      `${src}/features/settings/components/placeholder-detail-view/placeholder-detail-view.stories.tsx`,
      'Screens/Settings/Placeholder',
    ],
    // Exception 2: an aspect segment may be sentence case.
    [
      `${kit}/primitives/overlays/sheet/sheet-root-page.test.stories.tsx`,
      'Tests/Sheet/Root page',
    ],
    [
      `${src}/screens/settings/agents/agents-list.test.stories.tsx`,
      'Tests/AgentsList',
    ],
  ])('passes in its folder: %s', (file, title): void => {
    expect(storyTitleProblems(file, meta(title))).toEqual([]);
  });

  it.each([
    [
      `${kit}/primitives/lists/grouped-list-content/grouped-list-content.stories.tsx`,
      'Primitives/GroupedListContent',
      "expected 'Design System/Primitives/Lists/GroupedListContent'",
    ],
    [
      `${kit}/primitives/lists/list/list-tiles.stories.tsx`,
      'Design System/Primitives/Lists/List tiles',
      "expected 'Design System/Primitives/Lists/List/Tiles'",
    ],
    [
      `${kit}/symbols/icon.stories.tsx`,
      'Symbols/Icon',
      "expected 'Design System/Icon'",
    ],
    [
      `${src}/features/feed/components/edit-row/edit-row.stories.tsx`,
      'EditRow',
      "expected 'Feed/EditRow'",
    ],
    // The group alone is no longer enough: the whole title is derived.
    [
      `${src}/features/feed/components/feed-notice/feed-notice.stories.tsx`,
      'Feed/Notices',
      "expected 'Feed/FeedNotice'",
    ],
    [
      `${src}/features/frame/scaffold/scaffold.stories.tsx`,
      'Shell/Scaffold',
      "expected 'Frame/Scaffold'",
    ],
    [
      `${src}/lib/product/screen/screen.stories.tsx`,
      'Shared/Screen',
      "expected 'Design System/Patterns/Screen'",
    ],
  ])(
    'fails on a title its path does not derive: %s',
    (file, title, expected): void => {
      expect(storyTitleProblems(file, meta(title))).toEqual([
        expect.stringContaining(expected),
      ]);
    },
  );

  it.each([
    [
      `${src}/screens/sessions/sessions-view.stories.tsx`,
      'Sessions/Sessions',
      /expected 'Screens\/Sessions\/…'/,
    ],
    // A screen needs its third segment; the check never reads its text.
    [
      `${src}/screens/sessions/session-list-view.stories.tsx`,
      'Screens/Sessions',
      /visible page title/,
    ],
    [
      `${src}/features/feed/components/feed/feed.test.stories.tsx`,
      'Feed/Feed',
      /expected 'Tests\/…'/,
    ],
  ])('fails outside its root: %s', (file, title, message): void => {
    expect(storyTitleProblems(file, meta(title))).toEqual([
      expect.stringMatching(message),
    ]);
  });

  it('fails a story in a folder with no group', (): void => {
    expect(
      storyTitleProblems(`${src}/helpers/thing.stories.tsx`, meta('Thing')),
    ).toEqual([expect.stringMatching(/no story group belongs/)]);
  });

  it('reads a one-line meta', (): void => {
    expect(
      storyTitleProblems(
        `${src}/lib/product/screen/screen.stories.tsx`,
        `const meta = { title: 'Screen' } satisfies Meta;`,
      ),
    ).toEqual([
      expect.stringContaining("expected 'Design System/Patterns/Screen'"),
    ]);
  });

  it('needs a literal title', (): void => {
    expect(
      storyTitleProblems(
        `${src}/lib/product/screen/screen.stories.tsx`,
        'const meta = {};',
      ),
    ).toEqual([expect.stringMatching(/needs a literal title/)]);
  });

  it('ignores files outside the kit and the client', (): void => {
    expect(
      storyTitleProblems(`${src}/lib/product/screen/screen.tsx`, ''),
    ).toEqual([]);
    expect(storyTitleProblems('apps/storybook/x.stories.tsx', '')).toEqual([]);
  });
});

describe('the title `pnpm new:story` writes', (): void => {
  it.each([
    [
      `${kit}/primitives/status/pill/pill.tsx`,
      'Design System/Primitives/Status/Pill',
    ],
    [
      `${src}/lib/product/scroll-fade/scroll-fade.tsx`,
      'Design System/Patterns/ScrollFade',
    ],
    // A screen's page title is the author's, so the derived one is only a starting point.
    [
      `${src}/screens/sessions/$id/session-new-view.tsx`,
      'Screens/Sessions/SessionNewView',
    ],
  ])('derives %s', (file, title): void => {
    expect(derivedStoryTitle(file)).toBe(title);
  });

  it('refuses a folder no story group belongs to', (): void => {
    expect((): string => derivedStoryTitle(`${src}/app/index.tsx`)).toThrow(
      'no story group belongs to this folder',
    );
  });
});

const feed = `${src}/features/feed/components/feed`;

const feedTitle = 'Tests/Feed';

const storyFile = (file: string, title: string): StoryFile => ({
  file,
  source: meta(title),
});

describe('two story files', (): void => {
  it('may not declare the same title', (): void => {
    expect(
      duplicateTitleProblems([
        storyFile(`${feed}/a.test.stories.tsx`, feedTitle),
        storyFile(`${feed}/b.test.stories.tsx`, feedTitle),
      ]),
    ).toEqual([
      expect.stringMatching(
        /title 'Tests\/Feed' is declared by 2 files: .*a\.test\.stories\.tsx, .*b\.test\.stories\.tsx$/,
      ),
    ]);
  });

  it('pass with a title each', (): void => {
    expect(
      duplicateTitleProblems([
        storyFile(`${feed}/a.test.stories.tsx`, feedTitle),
        storyFile(`${feed}/b.test.stories.tsx`, 'Tests/Feed/B'),
      ]),
    ).toEqual([]);
  });

  it('ignore files outside the kit and the client', (): void => {
    expect(
      duplicateTitleProblems([
        { file: 'apps/storybook/a.stories.tsx', source: meta('Tests/X') },
        { file: 'apps/storybook/b.stories.tsx', source: meta('Tests/X') },
      ]),
    ).toEqual([]);
  });
});
