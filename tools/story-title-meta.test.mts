import { describe, expect, it } from 'vitest';
import {
  drawing,
  kit,
  meta,
  src,
  svgTitle,
} from './story-title-fixtures.mocks.mts';
import { storyTitleProblems } from './story-title-rules.mts';

describe('a story title', (): void => {
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
