import { RNHostView, Row } from '@expo/ui';
import type * as React from 'react';
import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';

type ChildrenProps = { children: React.ReactNode };

type RowModifiers = React.ComponentProps<typeof Row>['modifiers'];

type HostedRowProps = ChildrenProps & {
  // The platform's frame for the row at the content's measured height.
  frame: (height: number | undefined) => RowModifiers;
};

// A plain React Native view hosted in a native row, which takes the view's measured height.
export function HostedRow({
  children,
  frame,
}: HostedRowProps): React.JSX.Element {
  const minimumHeight = useResolveClassNames('h-11').height;

  const [height, setHeight] = useState(
    typeof minimumHeight === 'number' ? minimumHeight : undefined,
  );

  return (
    <Row style={{ height }} modifiers={frame(height)}>
      <MeasuredRow onHeight={setHeight}>{children}</MeasuredRow>
    </Row>
  );
}

type MeasuredRowProps = ChildrenProps & { onHeight: (height: number) => void };

function MeasuredRow(props: MeasuredRowProps): React.JSX.Element {
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
  onHeight: (height: number) => void,
): (event: LayoutChangeEvent) => void {
  return (event) => onHeight(event.nativeEvent.layout.height);
}
