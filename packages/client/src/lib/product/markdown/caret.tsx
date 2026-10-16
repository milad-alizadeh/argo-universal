import type * as React from 'react';
import { View } from 'react-native';

export function Caret(): React.JSX.Element {
  return (
    <View
      testID="streaming-caret"
      className="ml-0.5 h-4 w-0.5 rounded-xs bg-foreground"
    />
  );
}
