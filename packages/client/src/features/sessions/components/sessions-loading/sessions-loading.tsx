import type { ListAppearance } from '@repo/kit/list-context';
import { groupedOnPhones } from '@repo/kit/list-grouped';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import type { SessionsLayout } from '../../stores/sessions-view';

// Placeholder text never shows: each skeleton bar takes the width its line would.
const skeletonRows = [
  {
    title: 'Fix the sidebar scroll',
    subtitle: 'Claude Code · main',
    meta: '2 hours',
  },
  { title: 'Add a sign-in step', subtitle: 'Codex · auth', meta: '1 day' },
  {
    title: 'Draw the loading rows again',
    subtitle: 'Claude Code · list-ui',
    meta: '3 days',
  },
  { title: 'Rename the Drawer', subtitle: 'Gemini · nav', meta: '1 week' },
] as const;

export interface SessionsLoadingProps {
  // Regular rows carry their Agent line and age; Compact rows are one line each.
  layout?: SessionsLayout;
}

// Compact rows show a title only; Regular rows add their Agent line and age, as the Session rows do.
function SkeletonRows({ layout }: SessionsLoadingProps): React.ReactNode {
  const compact = layout === 'compact';

  return skeletonRows.map((row) => (
    <ListItem
      key={row.title}
      isLoading
      leading={null}
      title={row.title}
      subtitle={compact ? undefined : row.subtitle}
      meta={compact ? undefined : row.meta}
    />
  ));
}

const skeletonInsets = {
  fit: true,
  padding: { compact: 4, wide: 0 },
  paddingTop: { compact: 5, wide: 2 },
} as const;

// The Sessions list's own shape, a Project's section header over its rows, so nothing shifts when Sessions load.
function SkeletonList({
  layout,
  appearance,
}: SessionsLoadingProps & { appearance: ListAppearance }): React.JSX.Element {
  return (
    <List appearance={appearance} {...skeletonInsets}>
      <List.Section isLoading title="Example Project">
        <SkeletonRows layout={layout} />
      </List.Section>
    </List>
  );
}

const sidebarAppearance = (appearance: ListAppearance): ListAppearance =>
  Platform.OS === 'web' ? 'plain' : appearance;

// A wide web sidebar keeps loading rows as flat as the Sessions they will replace.
function LoadingList({ layout }: SessionsLoadingProps): React.JSX.Element {
  const appearance = layout === 'compact' ? groupedOnPhones('plain') : 'cards';

  return (
    <SizeClass
      compact={<SkeletonList layout={layout} appearance={appearance} />}
      wide={
        <SkeletonList
          layout={layout}
          appearance={sidebarAppearance(appearance)}
        />
      }
    />
  );
}

// Wide, this view sits outside the list, so it adds the list column's inset itself: 8 from the left, 14 from the right.
export function SessionsLoading({
  layout = 'regular',
}: SessionsLoadingProps): React.JSX.Element {
  return (
    <View
      role="status"
      accessibilityLabel="Loading Sessions"
      className="wide:pl-2 wide:pr-3.5"
    >
      <LoadingList layout={layout} />
    </View>
  );
}
