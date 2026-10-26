import type * as React from 'react';
import { View } from 'react-native';

// Android rests an inline view on the baseline, so the caret drops by a descender to span the line like a text cursor.
export function Caret(): React.JSX.Element {
  return (
    <View
      testID="streaming-caret"
      className="ml-0.5 h-4 w-0.5 rounded-xs bg-foreground android:translate-y-1"
    />
  );
}
