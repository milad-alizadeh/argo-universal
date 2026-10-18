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
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListContentProps } from './grouped-list-content-props';
import { GroupedListContent as WebGroupedListContent } from './grouped-list-content.tsx';

/*
 * A native list sizes a plain React Native view as it likes, so the row hosts it and takes its height.
 * iOS's Form gives the row a section of its own, with no card behind it and no inset; Android's column takes it as is,
 * inside a section when it has a title.
 */
export function GroupedListContent(
  props: GroupedListContentProps,
): React.JSX.Element {
  if (useWide()) return <WebGroupedListContent {...props} />;

  const row = <HostedRow>{props.children}</HostedRow>;

  if (Platform.OS === 'ios')
    return <BareSection title={props.title}>{row}</BareSection>;

  return <TitledRow title={props.title}>{row}</TitledRow>;
}

function TitledRow({
  children,
  title,
}: {
  children: React.ReactElement;
  title?: string;
}): React.JSX.Element {
  if (!title) return children;

  return <GroupedListSection title={title}>{children}</GroupedListSection>;
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
  title,
}: {
  children: React.ReactElement;
  title?: string;
}): React.JSX.Element {
  return (
    <FieldGroup.Section title={title} modifiers={bareRow}>
      {children}
    </FieldGroup.Section>
  );
}

GroupedListContent satisfies React.ComponentType<GroupedListContentProps>;
