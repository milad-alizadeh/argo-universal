import { FieldGroup, type RowProps } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListContentProps } from './grouped-list-content-props';
import { GroupedListContent as WebGroupedListContent } from './grouped-list-content.tsx';
import { HostedRow } from './hosted-row';

// The content spans its list at its measured height.
const rowFrame = (height: number | undefined): RowProps['modifiers'] =>
  Platform.OS === 'ios'
    ? [frame({ height, maxWidth: Infinity })]
    : [fillMaxWidth()];

export function GroupedListContent(
  props: GroupedListContentProps,
): React.JSX.Element {
  if (useWide()) return <WebGroupedListContent {...props} />;

  return contentSection(props);
}

/*
 * Free content, such as a form's actions, set between the cards: a stock FieldGroup.Section with no
 * rows and the content in its footer slot, which neither platform draws on a card (@expo/ui 57
 * FieldGroup.SectionFooter; FieldSection.android.tsx, FieldSection.ios.tsx). GroupedList swaps each
 * GroupedListContent child for this element, as FieldGroup knows a section only by its type.
 */
export function contentSection(
  props: GroupedListContentProps,
  key?: React.Key,
): React.JSX.Element {
  return (
    <FieldGroup.Section key={key}>
      <FieldGroup.SectionFooter>
        <HostedRow frame={rowFrame}>{props.children}</HostedRow>
      </FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}

GroupedListContent satisfies React.ComponentType<GroupedListContentProps>;
