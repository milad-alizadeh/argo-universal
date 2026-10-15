import { RNHostView } from '@expo/ui/swift-ui';
import type { ReactElement, ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SheetBody } from './sheet-body';
import type { SheetProps } from './sheet-props';

type ContentProps = SheetProps & { fill: boolean; children: ReactNode };

/*
 * React Native content in the SwiftUI sheet, in RNHostView's two documented modes: matching its
 * content's size, so a fitted sheet takes the content's height, or filling the presentation for a
 * page under detents. A fitted page has no width to measure against, so it takes the screen's.
 */
export function SheetContent(props: ContentProps): ReactElement {
  const { width } = useWindowDimensions();

  return (
    <RNHostView matchContents={!props.fill}>
      <View
        style={props.fill ? undefined : { width }}
        className={props.fill ? 'flex-1' : undefined}
      >
        <SheetBody {...props} />
      </View>
    </RNHostView>
  );
}
