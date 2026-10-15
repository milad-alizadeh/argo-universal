import type * as React from 'react';
import { View } from 'react-native';

// Only loading has a drawing; once the Sessions load, the screen opens the chosen page.
export interface FirstSessionViewProps {
  state: 'loading';
}

// A wide window's `/sessions` while the Sessions load: blank, so neither page flashes.
export function FirstSessionView(
  _props: FirstSessionViewProps,
): React.JSX.Element {
  return <View className="flex-1 bg-content" />;
}
