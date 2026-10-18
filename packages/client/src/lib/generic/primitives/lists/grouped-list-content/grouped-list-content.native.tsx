import { FieldGroup, RNHostView, Row, type RowProps } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import {
  frame,
  listRowBackground,
  listRowInsets,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { type LayoutChangeEvent, Platform, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { useStackedList } from '#primitives/fields/field-layout';
import type { GroupedListContentProps } from './grouped-list-content-props';

/*
 * A native list sizes a plain React Native view as it likes, so the row hosts it and takes its height.
 * iOS's Form gives the row a section of its own, with no card behind it and no inset; a stacked list and
 * Android's column take it as is.
 */
export function GroupedListContent(
  props: GroupedListContentProps,
): React.JSX.Element {
  const stacked = useStackedList();
  const row = <HostedRow>{props.children}</HostedRow>;
  const formSection = Platform.OS === 'ios' && !stacked;

  return formSection ? <BareSection>{row}</BareSection> : row;
}

// The row spans its list at the content's measured height.
const rowFrame = (height: number | undefined): RowProps['modifiers'] =>
  Platform.OS === 'ios'
    ? [frame({ height, maxWidth: Infinity })]
    : [fillMaxWidth()];

type ChildrenProps = { children: React.ReactNode };

// The row starts at a list row's height until the content's first layout measures it.
function HostedRow({ children }: ChildrenProps): React.JSX.Element {
  const minimumHeight = useResolveClassNames('h-11').height;

  const [height, setHeight] = useState(
    typeof minimumHeight === 'number' ? minimumHeight : undefined,
  );

  return (
    <Row style={{ height }} modifiers={rowFrame(height)}>
      <MeasuredContent onHeight={setHeight}>{children}</MeasuredContent>
    </Row>
  );
}

type MeasuredContentProps = ChildrenProps & {
  onHeight: (height: number) => void;
};

function MeasuredContent(props: MeasuredContentProps): React.JSX.Element {
  return (
    <RNHostView>
      {/* Pinned to the top only, so its height follows the content, not the row frame it sets. */}
      <View
        className="absolute inset-x-0 top-0"
        onLayout={reportHeight(props.onHeight)}
      >
        {props.children}
      </View>
    </RNHostView>
  );
}

function reportHeight(
  onHeight: MeasuredContentProps['onHeight'],
): (event: LayoutChangeEvent) => void {
  return (event) => onHeight(event.nativeEvent.layout.height);
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
