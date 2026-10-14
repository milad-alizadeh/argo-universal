import { RNHostView } from '@expo/ui/swift-ui';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { SheetWidth } from './bottom-sheet-width';

export function SheetViewport(props: {
  fit?: boolean;
  children: (height?: number) => React.ReactElement;
}): React.JSX.Element {
  const { height, onLayout } = useMeasuredHeight();

  return (
    <RNHostView matchContents={props.fit} onLayout={onLayout}>
      <SheetWidth fit={props.fit}>
        <ViewportContent {...props} height={height} />
      </SheetWidth>
    </RNHostView>
  );
}

interface MeasuredHeight {
  height: number | undefined;
  onLayout: React.ComponentProps<typeof RNHostView>['onLayout'];
}

function useMeasuredHeight(): MeasuredHeight {
  const [height, setHeight] = useState<number>();

  return {
    height,
    onLayout: (event) => setHeight(event.nativeEvent.layout.height),
  };
}

function ViewportContent(props: {
  fit?: boolean;
  height: number | undefined;
  children: (height?: number) => React.ReactElement;
}): React.JSX.Element {
  if (props.fit) return props.children();

  return (
    <View collapsable={false} className="flex-1">
      <View style={{ height: props.height }}>
        {props.children(props.height)}
      </View>
    </View>
  );
}
