import { ModalBottomSheet, RNHostView } from '@expo/ui/jetpack-compose';
import {
  fillMaxHeight,
  fillMaxWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { BottomSheetContent } from './bottom-sheet-content';
import type { BottomSheetProps } from './bottom-sheet.types';

type HostedSheetProps = Pick<
  BottomSheetProps,
  | 'onOpenChange'
  | 'label'
  | 'children'
  | 'footer'
  | 'dismissible'
  | 'contentScrolls'
  | 'surface'
  | 'fit'
>;

export function HostedSheetContent(props: HostedSheetProps): React.JSX.Element {
  const { width } = useWindowDimensions();

  return (
    <RNHostView
      matchContents={props.fit}
      modifiers={props.fit ? [fillMaxWidth()] : [fillMaxHeight()]}
    >
      <View style={props.fit ? { width } : { flex: 1 }}>
        <BottomSheetContent {...props} />
      </View>
    </RNHostView>
  );
}

export function SheetDragHandle(): React.JSX.Element {
  const { width } = useWindowDimensions();

  return (
    <ModalBottomSheet.DragHandle>
      <RNHostView matchContents modifiers={[fillMaxWidth()]}>
        <DragGrip width={width} />
      </RNHostView>
    </ModalBottomSheet.DragHandle>
  );
}

function DragGrip(props: { width: number }): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      style={{ width: props.width }}
      className="h-8 items-center justify-center"
    >
      <View className="w-8 h-1 rounded-full bg-muted-foreground" />
    </View>
  );
}
