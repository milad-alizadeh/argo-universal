import type * as React from 'react';
import { View } from 'react-native';
import {
  type SidebarBarProps,
  SidebarBarRow,
  sidebarBarState,
} from './sidebar-bar-row';

export type { SidebarBarProps } from './sidebar-bar-row';

// A tablet's list header shows and hides with the list, with no motion of its own.
export function SidebarBar(props: SidebarBarProps): React.JSX.Element {
  return (
    <View className="absolute top-0" {...sidebarBarState(props)}>
      <SidebarBarRow>{props.children}</SidebarBarRow>
    </View>
  );
}
