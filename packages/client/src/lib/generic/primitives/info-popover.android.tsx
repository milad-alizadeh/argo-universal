import {
  Host,
  RNHostView,
  Text,
  TooltipBox,
  type TooltipBoxRef,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useRef } from 'react';
import type { InfoPopoverProps } from './info-popover-props';
import { InfoPopoverTrigger } from './info-popover-trigger';

export function InfoPopover(props: InfoPopoverProps): React.JSX.Element {
  const tooltip = useRef<TooltipBoxRef>(null);
  return (
    <Host matchContents>
      <TooltipBox ref={tooltip} isPersistent>
        <TooltipText text={props.text} />
        <TooltipAnchor
          accessibilityLabel={props.accessibilityLabel}
          onPress={() => void tooltip.current?.show()}
        />
      </TooltipBox>
    </Host>
  );
}

function TooltipText({
  text,
}: Pick<InfoPopoverProps, 'text'>): React.JSX.Element {
  return (
    <TooltipBox.RichTooltip>
      <TooltipBox.RichTooltip.Text>
        <Text>{text}</Text>
      </TooltipBox.RichTooltip.Text>
    </TooltipBox.RichTooltip>
  );
}

function TooltipAnchor(
  props: React.ComponentProps<typeof InfoPopoverTrigger>,
): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <InfoPopoverTrigger {...props} />
    </RNHostView>
  );
}
