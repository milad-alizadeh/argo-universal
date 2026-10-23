import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

type FrameProps = { search: ReactNode; footer: ReactNode; children: ReactNode };

// A phone page: the search field above the list, the action below, on the content surface.
export function PageFrame(props: FrameProps): ReactElement {
  return (
    <View className="flex-1 bg-content">
      {props.search}
      {props.children}
      {props.footer}
    </View>
  );
}
