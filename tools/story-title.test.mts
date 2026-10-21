import { describe, expect, it } from 'vitest';
import { componentName, storyPath, storyTitle } from './story-title.mts';

const src = 'packages/client/src';

describe('a story title derives from the component path', (): void => {
  it.each([
    [
      `${src}/lib/generic/primitives/status/pill/pill.tsx`,
      'Design System/Primitives/Status/Pill',
    ],
    [
      `${src}/lib/generic/primitives/actions/button/button.tsx`,
      'Design System/Primitives/Actions/Button',
    ],
    [`${src}/lib/generic/symbols/icon.tsx`, 'Design System/Icon'],
    [`${src}/lib/product/screen/screen.tsx`, 'Shared/Screen'],
    [`${src}/features/feed/components/edit-row/edit-row.tsx`, 'Feed/EditRow'],
    [
      `${src}/features/agents/components/agent-list-view/agent-list-view.tsx`,
      'Screens/Agents/AgentListView',
    ],
    [
      `${src}/screens/sessions/session-detail-view.tsx`,
      'Screens/Sessions/SessionDetailView',
    ],
  ])('titles %s', (path: string, title: string): void => {
    expect(storyTitle(path)).toBe(title);
  });

  it('keeps the title when the kit moves to its own package', (): void => {
    expect(storyTitle('packages/kit/src/primitives/status/pill/pill.tsx')).toBe(
      'Design System/Primitives/Status/Pill',
    );
  });

  it('has no title for a folder that belongs to no group', (): void => {
    expect(storyTitle('packages/engine/src/feed/feed.ts')).toBeUndefined();
  });

  it('puts the story beside its component', (): void => {
    expect(
      storyPath(`${src}/lib/generic/primitives/status/pill/pill.tsx`),
    ).toBe(`${src}/lib/generic/primitives/status/pill/pill.stories.tsx`);
    expect(componentName('a/b/grouped-list-item.tsx')).toBe('GroupedListItem');
  });
});
