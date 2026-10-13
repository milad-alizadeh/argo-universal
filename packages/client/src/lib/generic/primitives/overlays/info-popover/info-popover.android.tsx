import {
  RNHostView,
  Text,
  TooltipBox,
  type TooltipBoxRef,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useRef } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '../../native/host';
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
  const { popover, popoverForeground } = useNativeTheme().colors;

  return (
    <TooltipBox.RichTooltip
      containerColor={popover}
      contentColor={popoverForeground}
      titleContentColor={popoverForeground}
      actionContentColor={popoverForeground}
    >
      <TooltipLabel text={text} color={popoverForeground} />
    </TooltipBox.RichTooltip>
  );
}

function TooltipLabel(props: {
  text: string;
  color: string | undefined;
}): React.JSX.Element {
  return (
    <TooltipBox.RichTooltip.Text>
      <Text color={props.color}>{props.text}</Text>
    </TooltipBox.RichTooltip.Text>
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
