import type * as React from 'react';
import { View } from 'react-native';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
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

interface SessionsLoadingProps {
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

// The Sessions list's own shape, a Project's section header over its rows, so nothing shifts when Sessions load.
function SkeletonList({ layout }: SessionsLoadingProps): React.JSX.Element {
  return (
    <List
      appearance={layout === 'compact' ? 'grouped' : 'cards'}
      fit
      padding={{ compact: 4, wide: 0 }}
      paddingTop={{ compact: 5, wide: 2 }}
    >
      <List.Section isLoading title="Example Project">
        <SkeletonRows layout={layout} />
      </List.Section>
    </List>
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
      <SkeletonList layout={layout} />
    </View>
  );
}
