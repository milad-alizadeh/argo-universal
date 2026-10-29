import { describe, expect, it } from 'vitest';
import { kit, meta, src, svgTitle } from './story-title-fixtures.mocks.mts';
import { storyTitleProblems } from './story-title-rules.mts';

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
    // Exception 2: a test's title is its subject's under `Tests/`; with no story beside it, its own path.
    [
      `${kit}/primitives/overlays/sheet/sheet-root-screen.test.stories.tsx`,
      'Tests/Design System/Primitives/Overlays/Sheet/RootScreen',
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
  ])('fails outside its root: %s', (file, title, message): void => {
    expect(storyTitleProblems(file, meta(title))).toEqual([
      expect.stringMatching(message),
    ]);
  });
});
