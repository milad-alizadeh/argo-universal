import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

// A closed panel's controls float in the title bar on a pill around their 32 buttons; they stay ghost, so only a hover tints them.
export function BandCapsule({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <View
      testID="window-band-capsule"
      className="h-9 shrink-0 flex-row items-center gap-1 rounded-full bg-card p-0.5 shadow-capsule"
    >
      {children}
    </View>
  );
}
