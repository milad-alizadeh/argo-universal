import * as WebPopover from '@radix-ui/react-popover';
import * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { TextClassContext } from '#primitives/content/text';
import { useOpenState } from '#primitives/overlays/open-state';
import { PopoverContext, usePopoverState } from './popover-context';
import { HoverProvider, PopoverHover } from './popover-hover';
import { hoverContentProps } from './popover-hover-focus';
import type {
  PopoverContentProps as ContentProps,
  PopoverProps,
} from './popover-props';

export { PopoverTrigger } from './popover-trigger';

export { PopoverHoverGroup } from './popover-hover-group';

export { usePopoverClose } from './popover-context';

/*
 * The web's popover, on Radix Popover (`@radix-ui/react-popover`): Root `open`/`onOpenChange`, Trigger,
 * Portal and Content `side`/`align`/`sideOffset`/`onOpenAutoFocus`/`onCloseAutoFocus`.
 */
export function Popover(props: PopoverProps): React.JSX.Element {
  const state = useOpenState(props);

  return (
    <PopoverContext.Provider value={state}>
      <WebPopover.Root open={state.open} onOpenChange={state.onOpenChange}>
        <View className={props.className} style={props.style}>
          <HoverProvider enabled={props.openOnHover}>
            {props.children}
          </HoverProvider>
        </View>
      </WebPopover.Root>
    </PopoverContext.Provider>
  );
}

const contentClassName =
  'bg-card border-border outline-hidden z-50 w-72 rounded-2xl border p-4 shadow-card popover-content cursor-auto';

function contentPlacement({
  align = 'center',
  sideOffset = 4,
}: ContentProps): Pick<ContentProps, 'align' | 'sideOffset'> {
  return { align, sideOffset };
}

const listContentClassName = 'w-80 overflow-hidden p-0';

// A ref handed to the content still reaches Radix's element: the close transition waits on it.
type BodyProps = ContentProps & { ref?: React.Ref<HTMLDivElement> };

function PopoverBody({ ref, ...props }: BodyProps): React.JSX.Element {
  const { open } = usePopoverState();
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
    'aria-label': props.accessibilityLabel,
  };
}

const surfaceClassName = (props: ContentProps): string =>
  cn(contentClassName, props.list && listContentClassName, props.className);

function PopoverSurface(
  props: ContentProps & { open: boolean },
): React.JSX.Element {
  return (
    <View
      style={props.style}
      className={surfaceClassName(props)}
      data-state={props.open ? 'open' : 'closed'}
    >
      <TextClassContext.Provider value="text-foreground">
        {props.children}
      </TextClassContext.Provider>
    </View>
  );
}

function PopoverContent(props: ContentProps): React.JSX.Element {
  return (
    <WebPopover.Portal>
      <PopoverBody {...props} />
    </WebPopover.Portal>
  );
}

export { PopoverContent };

Popover satisfies React.ComponentType<PopoverProps>;

PopoverContent satisfies React.ComponentType<ContentProps>;
