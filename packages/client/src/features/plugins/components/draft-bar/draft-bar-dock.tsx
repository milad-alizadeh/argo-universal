import type * as React from 'react';
import { View } from 'react-native';

// Floats the Draft bar over the bottom of the page, centred. Only the bar takes touches; the page under the rest of the strip stays reachable.
export function DraftBarDock({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-6 items-center px-3"
    >
      {children}
    </View>
  );
}
