import * as WebPopover from '@radix-ui/react-popover';
import { type ComponentType, type JSX, useContext } from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  type TriggerHandlers,
  triggerChild,
} from '#primitives/overlays/open-state';
import { usePopoverState } from './popover-context';
import { PopoverHover } from './popover-hover';
import type { PopoverTriggerProps as TriggerProps } from './popover-props';

// Radix's Trigger anchors the content and names it; the caller's element draws the trigger.
export function PopoverTrigger(props: TriggerProps): JSX.Element {
  const behavior = useTriggerBehavior(props);

  return (
    <WebPopover.Trigger asChild disabled={props.disabled ?? undefined}>
      {triggerChild(props.children, behavior, {
        role: 'button',
        disabled: props.disabled,
      })}
    </WebPopover.Trigger>
  );
}

function useTriggerBehavior(props: TriggerProps): TriggerHandlers {
  const { open, onOpenChange } = usePopoverState();
  const hover = useContext(PopoverHover);

  return {
    ...hoverTrigger(hover, props.disabled),
    onPress: (event: GestureResponderEvent | undefined) => {
      // Radix's own click toggle would race the press below.
      event?.preventDefault();
      press(hover, open, onOpenChange);
    },
  };
}

function press(
  hover: React.ContextType<typeof PopoverHover>,
  open: boolean,
  onOpenChange: (open: boolean) => void,
): void {
  if (!hover) {
    onOpenChange(!open);

    return;
  }

  const value = hover.isPointer() || !open;
  hover.promote();
  onOpenChange(value);
}

function hoverTrigger(
  hover: React.ContextType<typeof PopoverHover>,
  disabled: TriggerProps['disabled'],
): TriggerHandlers {
  if (disabled || !hover) return {};

  return {
    onHoverIn: () => hover.enter('trigger'),
    onHoverOut: () => hover.leave('trigger'),
  };
}

PopoverTrigger satisfies ComponentType<TriggerProps>;
