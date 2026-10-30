import { describe, expect, it } from 'vitest';
import { kit, meta, src, svgTitle } from './story-title-fixtures.mocks.mts';
import { derivedStoryTitle, storyTitleProblems } from './story-title-rules.mts';

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
