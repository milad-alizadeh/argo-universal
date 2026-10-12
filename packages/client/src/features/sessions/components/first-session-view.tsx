import type { ReactNode } from 'react';
import { View } from 'react-native';

export type FirstSessionViewProps =
  | { state: 'loading' }
  // The chosen Session or New Session, as a slot.
  | { state: 'chosen'; children: ReactNode };

// The wide window's `/`: blank while the Sessions load, then the chosen page.
export function FirstSessionView(props: FirstSessionViewProps): ReactNode {
  switch (props.state) {
    case 'loading':
      return <View className="flex-1 bg-sidebar" />;
    case 'chosen':
      return props.children;
  }
}
