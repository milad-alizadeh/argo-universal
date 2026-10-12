import { describe, expect, it } from 'vitest';
import { storyTitleProblems } from './story-title-rules.mts';

const src = 'packages/client/src';
const meta = (title: string): string =>
  `const meta = {\n  title: '${title}',\n} satisfies Meta;`;

describe('a story title', (): void => {
  it.each([
    [
      `${src}/lib/generic/primitives/list-item.stories.tsx`,
      'Design System/Primitives/ListItem',
    ],
    [`${src}/lib/product/screen.stories.tsx`, 'Shared/Screen'],
    [`${src}/features/feed/components/edit-row.stories.tsx`, 'Feed/EditRow'],
    [
      `${src}/features/frame/components/desktop-shell.stories.tsx`,
      'Shell/DesktopShell',
    ],
    [
      `${src}/features/agents/components/agent-list-view.stories.tsx`,
      'Screens/Settings/Agents',
    ],
    [
      `${src}/features/agents/components/agents-list.test.stories.tsx`,
      'Tests/AgentsList',
    ],
  ])('passes in its folder: %s', (file, title): void => {
    expect(storyTitleProblems(file, meta(title))).toEqual([]);
  });

  it.each([
    [
      `${src}/lib/generic/primitives/field-row.stories.tsx`,
      'Primitives/FieldRow',
      /'Design System\/Primitives\/'/,
    ],
    [
      `${src}/features/feed/components/edit-row.stories.tsx`,
      'EditRow',
      /'Screens\/' or 'Feed\/'/,
    ],
    [
      `${src}/features/frame/components/desktop-shell.stories.tsx`,
      'Frame/DesktopShell',
      /'Shell\/'/,
    ],
    [`${src}/lib/product/screen.stories.tsx`, 'Screen', /'Shared\/'/],
    [
      `${src}/features/feed/components/feed.test.stories.tsx`,
      'Feed/Feed',
      /'Tests\/'/,
    ],
  ])('fails outside its group: %s', (file, title, group): void => {
    expect(storyTitleProblems(file, meta(title))).toEqual([
      expect.stringMatching(group),
    ]);
  });

  it('reads a one-line meta', (): void => {
    expect(
      storyTitleProblems(
        `${src}/lib/product/screen.stories.tsx`,
        `const meta = { title: 'Screen' } satisfies Meta;`,
      ),
    ).toEqual([expect.stringMatching(/'Shared\/'/)]);
  });

  it('needs a literal title', (): void => {
    expect(
      storyTitleProblems(
        `${src}/lib/product/screen.stories.tsx`,
        'const meta = {};',
      ),
    ).toEqual([expect.stringMatching(/needs a literal title/)]);
  });

  it('ignores files that are not client stories', (): void => {
    expect(storyTitleProblems(`${src}/lib/product/screen.tsx`, '')).toEqual([]);
    expect(storyTitleProblems('apps/storybook/x.stories.tsx', '')).toEqual([]);
  });
});
