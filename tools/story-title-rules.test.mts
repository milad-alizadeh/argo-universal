import { describe, expect, it } from 'vitest';
import { storyTitleProblems } from './story-title-rules.mts';

const src = 'packages/client/src';

const meta = (title: string): string =>
  `const meta = {\n  title: '${title}',\n} satisfies Meta;`;

describe('a story title', (): void => {
  it.each([
    [
      `${src}/lib/generic/primitives/lists/list-item/list-item.stories.tsx`,
      'Design System/Primitives/ListItem',
    ],
    [`${src}/lib/generic/symbols/icon.stories.tsx`, 'Design System/Icon'],
    [`${src}/lib/product/screen/screen.stories.tsx`, 'Shared/Screen'],
    [
      `${src}/features/feed/components/edit-row/edit-row.stories.tsx`,
      'Feed/EditRow',
    ],
    [
      `${src}/features/frame/components/desktop-shell/desktop-shell.stories.tsx`,
      'Shell/DesktopShell',
    ],
    [
      `${src}/features/agents/components/agent-list-view/agent-list-view.stories.tsx`,
      'Screens/Settings/Agents',
    ],
    [
      `${src}/features/settings/components/settings-placeholder-page.stories.tsx`,
      'Screens/Settings/Placeholder',
    ],
    [
      `${src}/features/frame/screens/placeholder-screens.stories.tsx`,
      'Screens/PlaceholderScreens',
    ],
    [
      `${src}/features/agents/components/custom-agent-form/custom-agent-form.stories.tsx`,
      'Screens/Settings/Add custom Agent',
    ],
    [
      `${src}/features/agents/components/agent-list-view/agents-list.test.stories.tsx`,
      'Tests/AgentsList',
    ],
  ])('passes in its folder: %s', (file, title): void => {
    expect(storyTitleProblems(file, meta(title))).toEqual([]);
  });

  it.each([
    [
      `${src}/lib/generic/primitives/fields/field-group-content/field-group-content.stories.tsx`,
      'Primitives/FieldGroupContent',
      /'Design System\/Primitives\/'/,
    ],
    [
      `${src}/lib/generic/symbols/icon.stories.tsx`,
      'Symbols/Icon',
      /'Design System\/'/,
    ],
    [
      `${src}/features/feed/components/edit-row/edit-row.stories.tsx`,
      'EditRow',
      /must start with 'Feed\/'$/,
    ],
    [
      `${src}/features/agents/components/catalog-row.stories.tsx`,
      'Screens/Settings/Catalog row',
      /must start with 'Agents\/'$/,
    ],
    [
      `${src}/features/frame/components/desktop-shell/desktop-shell.stories.tsx`,
      'Frame/DesktopShell',
      /'Shell\/'/,
    ],
    [`${src}/lib/product/screen/screen.stories.tsx`, 'Screen', /'Shared\/'/],
    [
      `${src}/features/feed/components/feed/feed.test.stories.tsx`,
      'Feed/Feed',
      /'Tests\/'/,
    ],
  ])('fails outside its group: %s', (file, title, group): void => {
    expect(storyTitleProblems(file, meta(title))).toEqual([
      expect.stringMatching(group),
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
    ).toEqual([expect.stringMatching(/'Shared\/'/)]);
  });

  it('needs a literal title', (): void => {
    expect(
      storyTitleProblems(
        `${src}/lib/product/screen/screen.stories.tsx`,
        'const meta = {};',
      ),
    ).toEqual([expect.stringMatching(/needs a literal title/)]);
  });

  it('ignores files that are not client stories', (): void => {
    expect(
      storyTitleProblems(`${src}/lib/product/screen/screen.tsx`, ''),
    ).toEqual([]);
    expect(storyTitleProblems('apps/storybook/x.stories.tsx', '')).toEqual([]);
  });
});
