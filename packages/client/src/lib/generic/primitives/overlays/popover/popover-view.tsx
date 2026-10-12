import * as WebPopover from '@radix-ui/react-popover';
import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { View } from 'react-native';
import { TextClassContext } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { HoverProvider, PopoverHover } from './popover-hover';
import { hoverContentProps } from './popover-hover-focus';
export { PopoverTrigger } from './popover-trigger';
export { PopoverHoverGroup } from './popover-hover';

type ContentProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Content>,
  'side' | 'ref'
> & {
  ref?: React.Ref<HTMLDivElement>;
  side?: 'top' | 'bottom' | 'left' | 'right';
  alignOffset?: number;
  portalHost?: string;
  onClosed?: () => void;
};
export function Popover({
  openOnHover,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root> & {
  openOnHover?: boolean;
}): React.JSX.Element {
  return (
    <PopoverPrimitive.Root {...props}>
      <HoverProvider enabled={openOnHover}>{children}</HoverProvider>
    </PopoverPrimitive.Root>
  );
}

export function usePopoverClose(): () => void {
  const { onOpenChange } = PopoverPrimitive.useRootContext();
  return React.useCallback(() => onOpenChange(false), [onOpenChange]);
}
const contentClassName =
  'bg-popover border-border outline-hidden z-50 w-72 rounded-2xl border p-4 shadow-card popover-content cursor-auto';

function contentPlacement({
  align = 'center',
  sideOffset = 4,
}: ContentProps): Pick<ContentProps, 'align' | 'sideOffset'> {
  return { align, sideOffset };
}

function PopoverBody({ ref, ...props }: ContentProps): React.JSX.Element {
  const { open } = PopoverPrimitive.useRootContext();
  const hover = React.useContext(PopoverHover);
  return (
    <WebPopover.Content
      ref={ref}
      {...webContentProps(props)}
      {...hoverContentProps(hover, props)}
    >
      <PopoverSurface {...props} open={open} />
    </WebPopover.Content>
  );
}

function webContentProps(
  props: Omit<ContentProps, 'ref'>,
): React.ComponentProps<typeof WebPopover.Content> {
  return {
    ...contentPlacement(props),
    side: props.side,
    alignOffset: props.alignOffset,
    avoidCollisions: props.avoidCollisions,
    'aria-label': props.accessibilityLabel,
    onCloseAutoFocus: props.onClosed ?? props.onCloseAutoFocus,
    ...contentInteractions(props),
  };
}

function PopoverSurface(
  props: Omit<ContentProps, 'ref'> & { open: boolean },
): React.JSX.Element {
  return (
    <View
      style={props.style}
      className={cn(contentClassName, props.className)}
      data-state={props.open ? 'open' : 'closed'}
    >
      <TextClassContext.Provider value="text-popover-foreground">
        {props.children}
      </TextClassContext.Provider>
    </View>
  );
}

function PopoverContent({
  portalHost: _portalHost,
  ...props
}: ContentProps): React.JSX.Element {
  return (
    <WebPopover.Portal>
      <PopoverBody {...props} />
    </WebPopover.Portal>
  );
}
export { PopoverContent };

function contentInteractions(
  props: Omit<ContentProps, 'ref'>,
): React.ComponentProps<typeof WebPopover.Content> {
  return {
    onOpenAutoFocus: props.onOpenAutoFocus,
    onEscapeKeyDown: props.onEscapeKeyDown,
    onInteractOutside: props.onInteractOutside,
    onPointerDownOutside: props.onPointerDownOutside,
  };
}
