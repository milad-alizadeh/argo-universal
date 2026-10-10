import {
  Host,
  RNHostView,
  Text,
  TooltipBox,
  type TooltipBoxRef,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useRef } from 'react';
import { Pressable } from 'react-native';
import { Icon } from '../symbols/icon';
import {
  type InfoPopoverProps,
  infoPopoverTriggerClass,
} from './info-popover-props';

// The Material rich tooltip, so it shows above a native sheet; it stays until dismissed.
export function InfoPopover({
  accessibilityLabel,
  text,
}: InfoPopoverProps): React.JSX.Element {
  const tooltip = useRef<TooltipBoxRef>(null);
  return (
    <Host matchContents>
      <TooltipBox ref={tooltip} isPersistent>
        <TooltipBox.RichTooltip>
          <TooltipBox.RichTooltip.Text>
            <Text>{text}</Text>
          </TooltipBox.RichTooltip.Text>
        </TooltipBox.RichTooltip>
        <RNHostView matchContents>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={() => void tooltip.current?.show()}
            className={infoPopoverTriggerClass}
          >
            <Icon name="info" className="text-muted-foreground" />
          </Pressable>
        </RNHostView>
      </TooltipBox>
    </Host>
  );
}
