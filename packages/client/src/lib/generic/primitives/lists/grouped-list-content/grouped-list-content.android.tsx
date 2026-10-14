import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListContentProps } from './grouped-list-content-props';
import { GroupedListContent as WebGroupedListContent } from './grouped-list-content.tsx';
import { HostedRow } from './hosted-row';

const rowFrame = (): ReturnType<typeof fillMaxWidth>[] => [fillMaxWidth()];

// A Compose column sizes a plain React Native view by its last layout, so the row hosts it and takes its height.
export function GroupedListContent({
  children,
}: GroupedListContentProps): React.JSX.Element {
  if (useWide())
    return <WebGroupedListContent>{children}</WebGroupedListContent>;

  return <HostedRow frame={rowFrame}>{children}</HostedRow>;
}

GroupedListContent satisfies React.ComponentType<GroupedListContentProps>;
