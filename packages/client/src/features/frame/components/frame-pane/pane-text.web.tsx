import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { FramePaneProps } from './frame-pane';
import type { PaneGeometry } from './pane-geometry';

type PaneTextProps = Pick<FramePaneProps, 'testID' | 'children'> & {
  geometry: PaneGeometry;
};

export function ReflowingText({
  testID,
  children,
}: PaneTextProps): ReactElement {
  return (
    <View testID={`${testID}-content`} className="flex-1 h-full w-full">
      {children}
    </View>
  );
}

export function SlidingText({
  testID,
  geometry,
  children,
}: PaneTextProps): ReactElement {
  return (
    <View
      testID={`${testID}-content`}
      className="flex-1 h-full"
      style={{ width: geometry.contentWidth }}
    >
      {children}
    </View>
  );
}
