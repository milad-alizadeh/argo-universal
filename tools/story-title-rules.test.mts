import { describe, expect, it } from 'vitest';
import {
  derivedStoryTitle,
  duplicateTitleProblems,
  type StoryFile,
  storyTitleProblems,
} from './story-title-rules.mts';

const src = 'packages/client/src';

const kit = 'packages/kit/src';

const svgTitle = 'Design System/Primitives/Visual/Svg';

const meta = (title: string): string =>
  `const meta = {\n  title: '${title}',\n} satisfies Meta;`;

// A file draws an aspect of its folder only when its meta draws the folder's own component.
const drawing = (title: string, component: string): string =>
  `const meta = {\n  title: '${title}',\n  component: ${component},\n} satisfies Meta;`;

describe('a story title', (): void => {
  it.each([
    [
      `${kit}/primitives/lists/grouped-list-item/grouped-list-item.stories.tsx`,
      'Design System/Primitives/Lists/GroupedListItem',
    ],
    // Four segments, always: a primitive carries the category folder it sits in.
    [`${kit}/primitives/visual/svg/svg.stories.tsx`, svgTitle],
    // A foundation is a token scale no component owns; its topic folder is its last segment.
    [
      `${kit}/foundations/tones/tones.stories.tsx`,
      'Design System/Foundations/Tones',
    ],
    [
      `${kit}/foundations/spacing/spacing.stories.tsx`,
      'Design System/Foundations/Spacing',
    ],
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
    // Exception 2: a test's subject is #1200's to derive, so only its root is checked here.
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

  it.each([
    // The folder's own component, drawn by a `<folder>-<aspect>` file: an aspect of it.
    [
      `${kit}/primitives/lists/list/list-tiles.stories.tsx`,
      'Design System/Primitives/Lists/List/Tiles',
      'List',
    ],
    [
      `${kit}/primitives/lists/list-item/list-item-settings.stories.tsx`,
      'Design System/Primitives/Lists/ListItem/Settings',
      'ListItem',
    ],
    // Its own component, in a folder whose name it happens to start with: its own node.
    [
      `${kit}/primitives/overlays/menu/menu-trigger.stories.tsx`,
      'Design System/Primitives/Overlays/MenuTrigger',
      'MenuTrigger',
    ],
    [
      `${src}/features/sessions/components/archive-session/archive-session-alert.stories.tsx`,
      'Sessions/ArchiveSessionAlert',
      'ArchiveSessionAlert',
    ],
  ])(
    'reads the component its meta draws: %s',
    (file, title, component): void => {
      expect(storyTitleProblems(file, drawing(title, component))).toEqual([]);
    },
  );

  it('refuses an aspect title from a file drawing its own component', (): void => {
    expect(
      storyTitleProblems(
        `${kit}/primitives/overlays/menu/menu-trigger.stories.tsx`,
        drawing(
          'Design System/Primitives/Overlays/Menu/Trigger',
          'MenuTrigger',
        ),
      ),
    ).toEqual([
      expect.stringContaining(
        "expected 'Design System/Primitives/Overlays/MenuTrigger'",
      ),
    ]);
  });

  it('fails a story in a folder with no group', (): void => {
    expect(
      storyTitleProblems(`${src}/helpers/thing.stories.tsx`, meta('Thing')),
    ).toEqual([expect.stringMatching(/no story group belongs/)]);
  });

  // One depth per kit root (#1199): a primitive is four segments, a foundation three, and nothing else.
  it('fails a primitive that skips its own folder', (): void => {
    expect(
      storyTitleProblems(
        `${kit}/primitives/visual/svg.stories.tsx`,
        meta(svgTitle),
      ),
    ).toEqual([
      expect.stringMatching(
        /a kit primitive lives in `primitives\/<category>\/<name>\/`/,
      ),
    ]);
  });

  it('fails a foundation that skips its own folder', (): void => {
    expect(
      storyTitleProblems(
        `${kit}/foundations/tones.stories.tsx`,
        meta('Design System/Foundations/Tones'),
      ),
    ).toEqual([expect.stringMatching(/or a foundation in `foundations/)]);
  });

  it('fails a kit story outside the two kit roots', (): void => {
    expect(
      storyTitleProblems(
        `${kit}/symbols/icon.stories.tsx`,
        meta('Design System/Icon'),
      ),
    ).toEqual([
      expect.stringMatching(
        /a kit story is a primitive in `primitives\/<category>\/<name>\/`/,
      ),
    ]);
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
    [`${kit}/primitives/visual/svg/svg.tsx`, svgTitle],
    [
      `${src}/lib/product/scroll-fade/scroll-fade.tsx`,
      'Design System/Patterns/ScrollFade',
    ],
    // A screen's page title is the author's, so the derived one is only a starting point.
    [
      `${src}/screens/sessions/$id/session-new-view.tsx`,
      'Screens/Sessions/SessionNewView',
    ],
    // A new component in a folder it shares takes its own node, not its neighbour's.
    [
      `${kit}/primitives/overlays/menu/menu-trigger.tsx`,
      'Design System/Primitives/Overlays/MenuTrigger',
    ],
  ])('derives %s, which the check then accepts', (file, title): void => {
    expect(derivedStoryTitle(file)).toBe(title);
    expect(
      storyTitleProblems(file.replace(/\.tsx$/, '.stories.tsx'), meta(title)),
    ).toEqual([]);
  });

  it('refuses a folder no story group belongs to', (): void => {
    expect((): string => derivedStoryTitle(`${src}/app/index.tsx`)).toThrow(
      'no story group belongs to this folder',
    );
  });

  it('says where a kit component with no folder belongs', (): void => {
    expect((): string =>
      derivedStoryTitle(`${kit}/primitives/visual/svg.tsx`),
    ).toThrow('a kit primitive lives in `primitives/<category>/<name>/`');
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
