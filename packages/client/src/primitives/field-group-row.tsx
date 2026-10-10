import { RNHostView, Row } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
type ChildrenProps = { children: React.ReactNode };
export function HostedRow({ children }: ChildrenProps): React.JSX.Element {
  const minimumHeight = useResolveClassNames('h-11').height;
  const [height, setHeight] = useState(
    typeof minimumHeight === 'number' ? minimumHeight : undefined,
  );
  return (
    <Row style={{ height }} modifiers={rowModifiers(height)}>
      <MeasuredRow onHeight={setHeight}>{children}</MeasuredRow>
    </Row>
  );
}

function rowModifiers(
  height: number | undefined,
): React.ComponentProps<typeof Row>['modifiers'] {
  return Platform.OS === 'ios'
    ? [frame({ height, maxWidth: Infinity })]
    : [fillMaxWidth()];
}

function MeasuredRow({
  children,
  onHeight,
}: ChildrenProps & { onHeight: (height: number) => void }): React.JSX.Element {
  return (
    <RNHostView>
      <View
        className="w-full"
        onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </RNHostView>
  );
}
