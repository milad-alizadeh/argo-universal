import { useDismissableLayerSurface } from '@radix-ui/react-dismissable-layer';
import * as WebPopover from '@radix-ui/react-popover';
import * as React from 'react';
import { View } from 'react-native';
import { OutsideColumn } from '#kit/content-column/content-column';
import { ListPlaceContext, popoverPlace, useListPlace } from '#kit/list-place';
import { menuSurfaceClassName, windowEdgeInset } from '#kit/menu-surface';
import { cn } from '#kit/utils';
import { TextClassContext } from '#primitives/content/text';
import { InsideHostContext } from '#primitives/native/host';
import { useOpenState } from '#primitives/overlays/open-state';
import { PopoverContext, usePopoverState } from './popover-context';
import { HoverProvider, PopoverHover } from './popover-hover';
import { hoverContentProps } from './popover-hover-focus';
import type {
  PopoverContentProps as ContentProps,
  PopoverProps,
} from './popover-props';
import {
  keepTriggerInside,
  TriggerElementProvider,
  useTriggerElement,
} from './popover-trigger-element';

export { PopoverTrigger } from './popover-trigger';

export { PopoverHoverGroup } from './popover-hover-group';

export { useEnclosingPopoverClose, usePopoverClose } from './popover-context';

/*
 * The web's popover, on Radix Popover (`@radix-ui/react-popover`): Root `open`/`onOpenChange`, Trigger,
 * Portal and Content `side`/`align`/`sideOffset`/`onOpenAutoFocus`/`onCloseAutoFocus`.
 */
export function Popover(props: PopoverProps): React.JSX.Element {
  const state = useOpenState(props);

  return (
    <PopoverContext.Provider value={state}>
      <WebPopover.Root open={state.open} onOpenChange={state.onOpenChange}>
        <PopoverFrame {...props} />
      </WebPopover.Root>
    </PopoverContext.Provider>
  );
}

function PopoverFrame(props: PopoverProps): React.JSX.Element {
  if (props.frameless) return <PopoverChildren {...props} />;

  return props.inline ? (
    <span className={props.className}>
      <PopoverChildren {...props} />
    </span>
  ) : (
    <View className={props.className} style={props.style}>
      <PopoverChildren {...props} />
    </View>
  );
}

function PopoverChildren(props: PopoverProps): React.JSX.Element {
  return (
    <TriggerElementProvider>
      <HoverProvider enabled={props.openOnHover}>
        {props.children}
      </HoverProvider>
    </TriggerElementProvider>
  );
}

const contentClassName = cn(
  menuSurfaceClassName,
  'outline-hidden z-50 w-72 p-4 popover-content cursor-auto',
);

function contentPlacement({
  align = 'center',
  sideOffset = 4,
  alignOffset,
}: ContentProps): Pick<ContentProps, 'align' | 'sideOffset' | 'alignOffset'> {
  return { align, sideOffset, alignOffset };
}

const listContentClassName = 'w-80 overflow-hidden p-0';

// A ref handed to the content still reaches Radix's element: the close transition waits on it.
type BodyProps = ContentProps & { ref?: React.Ref<HTMLDivElement> };

function PopoverBody({ ref, ...props }: BodyProps): React.JSX.Element {
  const { open } = usePopoverState();
  const hover = React.useContext(PopoverHover);

  return (
    <WebPopover.Content
      ref={useSurfaceRef(ref)}
      {...webContentProps(props)}
      onInteractOutside={keepTriggerInside(useTriggerElement())}
      {...hoverContentProps(hover, props)}
    >
      <PopoverSurface {...props} open={open} />
    </WebPopover.Content>
  );
}

/*
 * React Native Web's pressables stop a click's propagation, which Radix reads as a click another control kept. As a
 * dismissable surface, a click on this popover still counts as outside the popovers opened beside it, and closes them.
 */
function useSurfaceRef(
  ref: React.Ref<HTMLDivElement> | undefined,
): React.RefCallback<HTMLDivElement> {
  const surface = useDismissableLayerSurface();

  return React.useCallback(
    (node: HTMLDivElement | null) => {
      surface(node);
      setRef(ref, node);
    },
    [surface, ref],
  );
}

function setRef(
  ref: React.Ref<HTMLDivElement> | undefined,
  node: HTMLDivElement | null,
): void {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

function webContentProps(
  props: ContentProps,
): React.ComponentProps<typeof WebPopover.Content> {
  return {
    ...contentPlacement(props),
    side: props.side,
    collisionPadding: windowEdgeInset,
    'aria-label': props.accessibilityLabel,
    onEscapeKeyDown: props.onEscapeKeyDown,
  };
}

const surfaceClassName = (props: ContentProps): string =>
  cn(contentClassName, props.list && listContentClassName, props.className);

// Lists inside draw menu rows (the popover place); a phone's popover is a Sheet and keeps its grouped rows.
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
        <PopoverRows>{props.children}</PopoverRows>
      </TextClassContext.Provider>
    </View>
  );
}

/*
 * A popover opened from a Screen's column is a surface of its own, so its lists take none of the column's padding, nor
 * claim it from the Screen. It sits in a portal, outside any FieldGroup's tree it was opened from, so its Hosts draw
 * their own.
 */
function PopoverRows(props: { children: React.ReactNode }): React.JSX.Element {
  const place = popoverPlace(useListPlace());

  return (
    <InsideHostContext.Provider value={false}>
      <OutsideColumn>
        <ListPlaceContext value={place}>{props.children}</ListPlaceContext>
      </OutsideColumn>
    </InsideHostContext.Provider>
  );
}

// The Portal's direct child stays the content: its Presence needs that child's ref to wait out the close animation.
export function PopoverContent(props: ContentProps): React.JSX.Element {
  return (
    <WebPopover.Portal>
      <PopoverBody {...props} />
    </WebPopover.Portal>
  );
}

Popover satisfies React.ComponentType<PopoverProps>;

PopoverContent satisfies React.ComponentType<ContentProps>;
