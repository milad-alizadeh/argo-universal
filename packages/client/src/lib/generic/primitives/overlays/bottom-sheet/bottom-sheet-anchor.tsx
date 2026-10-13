import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

export function BottomSheetAnchor(props: {
  children: ReactNode;
}): ReactElement {
  return <View className="w-full">{props.children}</View>;
}
