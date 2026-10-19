import * as WebPopover from '@radix-ui/react-popover';
import type * as React from 'react';
import { View } from 'react-native';
import type { PopoverAnchorProps } from './popover-props';

// Radix's Anchor places the content against another control, for a popover a menu opens rather than its own trigger.
export function PopoverAnchor(props: PopoverAnchorProps): React.JSX.Element {
  return (
    <WebPopover.Anchor asChild>
      <View className="self-start">{props.children}</View>
    </WebPopover.Anchor>
  );
}
