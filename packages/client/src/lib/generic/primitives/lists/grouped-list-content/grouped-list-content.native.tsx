import { FieldGroup } from '@expo/ui';
import { listRowBackground, listRowInsets } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListContentProps } from './grouped-list-content-props';
import { GroupedListContent as WebGroupedListContent } from './grouped-list-content.tsx';
import { HostedRow } from './hosted-row';

/*
 * A native list sizes a plain React Native view as it likes, so the row hosts it and takes its height.
 * iOS's Form gives the row a section of its own, with no card behind it and no inset; Android's column takes it as is.
 */
export function GroupedListContent(
  props: GroupedListContentProps,
): React.JSX.Element {
  if (useWide()) return <WebGroupedListContent {...props} />;

  const row = <HostedRow>{props.children}</HostedRow>;

  return Platform.OS === 'ios' ? <BareSection>{row}</BareSection> : row;
}

const bareRow = [
  listRowBackground('transparent'),
  listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
];

function BareSection({
  children,
}: {
  children: React.ReactElement;
}): React.JSX.Element {
  return (
    <FieldGroup.Section modifiers={bareRow}>{children}</FieldGroup.Section>
  );
}

GroupedListContent satisfies React.ComponentType<GroupedListContentProps>;
