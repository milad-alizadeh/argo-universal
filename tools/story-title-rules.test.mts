import { describe, expect, it } from 'vitest';
import type { StoryFile } from './story-file.mts';
import { kit, meta, src } from './story-title-fixtures.mocks.mts';
import {
  duplicateTitleProblems,
  presentationTitles,
  type StoryTitles,
  storyTitleProblems,
} from './story-title-rules.mts';

const composer = `${src}/features/composer/components/composer`;

const registry = `${src}/lib/product/plugin-registry`;

const registryTitle = 'Design System/Patterns/PluginRegistry';

const composerTitle = 'Composer/Composer';

const composerStory = `${composer}/composer.stories.tsx`;

const route = `${src}/screens/sessions/$id`;

const beside = (entries: readonly [string, string][]): StoryTitles =>
  new Map(entries);

const subjects = beside([
  [composerStory, composerTitle],
  [`${registry}/plugin-registry.stories.tsx`, registryTitle],
  [
    `${registry}/replaceable-slot.stories.tsx`,
    'Design System/Patterns/ReplaceableSlot',
  ],
  [`${route}/session-detail-view.stories.tsx`, 'Screens/Sessions/Session'],
  [`${route}/session-new-view.stories.tsx`, 'Screens/Sessions/New Session'],
]);

describe("a test's title", (): void => {
  it.each([
    // The story whose name the test's name extends, with the rest as the aspect segment.
    [`${composer}/composer-send.test.stories.tsx`, 'Tests/Composer/Send'],
    // The repeated segment is said once, not twice.
    [`${composer}/composer.test.stories.tsx`, 'Tests/Composer'],
    [
      `${composer}/composer-attachment-limit.test.stories.tsx`,
      'Tests/Composer/AttachmentLimit',
    ],
    // The folder's own story, for a test named for one part of it.
    [
      `${registry}/plugin-canvas.test.stories.tsx`,
      `Tests/${registryTitle}/Canvas`,
    ],
    // A story its name extends wins over the folder's own.
    [
      `${registry}/replaceable-slot.test.stories.tsx`,
      'Tests/Design System/Patterns/ReplaceableSlot',
    ],
    // A route folder is named for nothing, so its detail view is the subject.
    [
      `${route}/session-usage.test.stories.tsx`,
      'Tests/Screens/Sessions/Session/Usage',
    ],
    [
      `${route}/session-detail-view-panels.test.stories.tsx`,
      'Tests/Screens/Sessions/Session/Panels',
    ],
  ])('mirrors its subject: %s', (file, title): void => {
    expect(storyTitleProblems(file, meta(title), subjects)).toEqual([]);
  });

  it('reports the title its subject derives', (): void => {
    expect(
      storyTitleProblems(
        `${composer}/composer-send.test.stories.tsx`,
        meta('Tests/Composer/Composer/Send'),
        subjects,
      ),
    ).toEqual([
      expect.stringContaining(
        "expected 'Tests/Composer/Send', found 'Tests/Composer/Composer/Send'",
      ),
    ]);
  });

  it.each([
    // No story beside it: the test's own folder is its subject's, so the same rules place it.
    [
      `${kit}/primitives/actions/button/button.test.stories.tsx`,
      'Tests/Design System/Primitives/Actions/Button',
    ],
    [`${feed}/feed.test.stories.tsx`, 'Tests/Feed'],
    [`${feed}/feed-collapsibles.test.stories.tsx`, 'Tests/Feed/Collapsibles'],
    // A folder no story group belongs to still leaves the leaf its own node under `Tests/`.
    [`${src}/app-providers.test.stories.tsx`, 'Tests/AppProviders'],
  ])('falls back to its own path: %s', (file, title): void => {
    expect(storyTitleProblems(file, meta(title))).toEqual([]);
  });

  /*
   * A screen's last segment is its visible page title (#1198), so a screen test with no story beside
   * it to mirror is held to its section, the one segment the folder gives.
   */
  it('holds a screen test with no story beside it to its section', (): void => {
    expect(
      storyTitleProblems(
        `${src}/screens/settings/agents/agents-list.test.stories.tsx`,
        meta('Tests/AgentsList'),
      ),
    ).toEqual([expect.stringContaining("expected 'Tests/Screens/Settings/…'")]);
  });

  it('reads only the presentation stories as subjects', (): void => {
    expect(
      presentationTitles([
        storyFile(composerStory, composerTitle),
        storyFile(`${composer}/composer.test.stories.tsx`, 'Tests/Composer'),
        { file: 'apps/storybook/x.stories.tsx', source: meta('X') },
      ]),
    ).toEqual(new Map([[composerStory, composerTitle]]));
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
