import * as WebPopover from '@radix-ui/react-popover';
import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { TextClassContext } from '#primitives/display/text';
import { HoverProvider, PopoverHover } from './popover-hover';
import { hoverContentProps } from './popover-hover-focus';
import type {
  PopoverContentProps as ContentProps,
  PopoverProps,
} from './popover-props';
import { Popover as PopoverRoot } from './popover-root';

export { PopoverTrigger } from './popover-trigger';

export { PopoverHoverGroup } from './popover-hover';

export function Popover({
  openOnHover,
  children,
  ...props
}: PopoverProps): React.JSX.Element {
  return (
    <PopoverRoot {...props}>
      <HoverProvider enabled={openOnHover}>{children}</HoverProvider>
    </PopoverRoot>
  );
}

export function usePopoverClose(): () => void {
  const { onOpenChange } = PopoverPrimitive.useRootContext();

  return React.useCallback(() => onOpenChange(false), [onOpenChange]);
}

const contentClassName =
  'bg-card border-border outline-hidden z-50 w-72 rounded-2xl border p-4 shadow-card popover-content cursor-auto';

function contentPlacement({
  align = 'center',
  sideOffset = 4,
}: ContentProps): Pick<ContentProps, 'align' | 'sideOffset'> {
  return { align, sideOffset };
}

// A ref handed to the content still reaches Radix's element: the close transition waits on it.
type BodyProps = ContentProps & { ref?: React.Ref<HTMLDivElement> };

function PopoverBody({ ref, ...props }: BodyProps): React.JSX.Element {
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
  props: ContentProps,
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
  props: ContentProps & { open: boolean },
): React.JSX.Element {
  return (
    <View
      style={props.style}
      className={cn(contentClassName, props.className)}
      data-state={props.open ? 'open' : 'closed'}
    >
      <TextClassContext.Provider value="text-card-foreground">
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
  props: ContentProps,
): React.ComponentProps<typeof WebPopover.Content> {
  return {
    onOpenAutoFocus: props.onOpenAutoFocus,
    onEscapeKeyDown: props.onEscapeKeyDown,
    onInteractOutside: props.onInteractOutside,
    onPointerDownOutside: props.onPointerDownOutside,
  };
}

Popover satisfies React.ComponentType<PopoverProps>;

PopoverContent satisfies React.ComponentType<ContentProps>;
