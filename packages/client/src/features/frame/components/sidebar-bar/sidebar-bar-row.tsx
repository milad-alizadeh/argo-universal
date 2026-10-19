import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { FrameMotion } from '../../utils/frame-timing';

export interface SidebarBarProps extends FrameMotion {
  // Where the list begins, past the rail, and how wide it is shown.
  left: number;
  width: number;
  sidebarShown: boolean;
  // The list's title and actions.
  children: ReactNode;
}

// A hidden header keeps its place but takes no touches and leaves the accessibility tree.
export const sidebarBarState = (props: SidebarBarProps) =>
  ({
    style: {
      left: props.left,
      width: props.width,
      opacity: props.sidebarShown ? 1 : 0,
    },
    'aria-hidden': !props.sidebarShown,
    inert: !props.sidebarShown,
  }) as const;

// The list's title and actions in the shared top bar; a tablet's drops by its rail's 16 inset and pads its top by 4, so its 40 content box centres on the first tile.
export function SidebarBarRow(props: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View className="h-frame-control flex-row items-center gap-1 pl-6 pr-3.5 native:mt-4 native:pt-1">
      {props.children}
    </View>
  );
}
