import * as WebPopover from '@radix-ui/react-popover';
import * as PopoverPrimitive from '@rn-primitives/popover';
import { Slot } from '@rn-primitives/slot';
import {
  type ComponentProps,
  type ComponentType,
  type JSX,
  useContext,
} from 'react';
import { Pressable, type GestureResponderEvent } from 'react-native';
import { PopoverHover } from './popover-hover';
import type { PopoverTriggerProps as TriggerProps } from './popover-props';

export function PopoverTrigger({
  asChild,
  ...props
}: TriggerProps): JSX.Element {
  const Component = asChild ? Slot : Pressable;
  const behavior = useTriggerBehavior(props);

  return (
    <WebPopover.Trigger asChild disabled={props.disabled ?? undefined}>
      <Component {...props} {...behavior} role="button" />
    </WebPopover.Trigger>
  );
}

function useTriggerBehavior(
  props: TriggerProps,
): ComponentProps<typeof Pressable> {
  const { open, onOpenChange } = PopoverPrimitive.useRootContext();
  const hover = useContext(PopoverHover);

  return {
    ...hoverTrigger(hover, props.disabled),
    onPress: (event) => {
      triggerEvent(event, props.onPress);
      press(hover, open, onOpenChange);
    },
  };
}

function triggerEvent(
  event: GestureResponderEvent | undefined,
  onPress: TriggerProps['onPress'],
): void {
  if (!event) return;
  event.preventDefault();
  onPress?.(event);
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
): ComponentProps<typeof Pressable> {
  if (disabled || !hover) return {};

  return { onHoverIn: hover.enter, onHoverOut: hover.leave };
}

PopoverTrigger satisfies ComponentType<TriggerProps>;
