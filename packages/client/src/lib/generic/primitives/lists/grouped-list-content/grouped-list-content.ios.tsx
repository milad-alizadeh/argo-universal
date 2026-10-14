import { Section } from '@expo/ui/swift-ui';
import {
  frame,
  listRowBackground,
  listRowInsets,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListContentProps } from './grouped-list-content-props';
import { GroupedListContent as WebGroupedListContent } from './grouped-list-content.tsx';
import { HostedRow } from './hosted-row';

const rowFrame = (height: number | undefined): ReturnType<typeof frame>[] => [
  frame({ height, maxWidth: Infinity }),
];

/*
 * A SwiftUI Form sizes a plain React Native view as it likes, so the row hosts it and takes its height.
 * The row has its own section with no card behind it and no inset.
 */
export function GroupedListContent(
  props: GroupedListContentProps,
): React.JSX.Element {
  if (useWide()) return <WebGroupedListContent {...props} />;

  return (
    <Section
      modifiers={[
        listRowBackground('transparent'),
        listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
      ]}
    >
      <HostedRow frame={rowFrame}>{props.children}</HostedRow>
    </Section>
  );
}

GroupedListContent satisfies React.ComponentType<GroupedListContentProps>;
