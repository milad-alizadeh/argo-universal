import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { cn } from '#lib/generic/utils';
import { TextClassContext } from '#primitives/display/text';
import { OverlayFields } from '#primitives/fields/field-layout';
import { NativeOnlyAnimatedView } from '#primitives/native/native-only-animated-view';
import { usePopoverDismissal } from './popover-dismissal';
import type {
  PopoverContentProps as ContentProps,
  PopoverTriggerProps as TriggerProps,
} from './popover-props';
import type { PopoverProps } from './popover-props';
import { ControlledPopoverState, Popover } from './popover-root';

function PopoverTrigger({ ref, ...props }: TriggerProps): React.JSX.Element {
  const { trigger, setRef } = useTriggerRef(ref);
  const open = React.useContext(ControlledPopoverState);
  const { triggerPosition } = PopoverPrimitive.useRootContext();
  React.useEffect(() => {
    if (open && !triggerPosition) openMeasuredTrigger(trigger.current);
  }, [open, triggerPosition, trigger]);

  return <PopoverPrimitive.Trigger {...props} ref={setRef} />;
}

function openMeasuredTrigger(
  trigger: PopoverPrimitive.TriggerRef | null,
): void {
  trigger?.open();
}

interface TriggerRefs {
  trigger: React.RefObject<PopoverPrimitive.TriggerRef | null>;
  setRef: React.RefCallback<PopoverPrimitive.TriggerRef>;
}

function useTriggerRef(ref: TriggerProps['ref']): TriggerRefs {
  const trigger = React.useRef<PopoverPrimitive.TriggerRef>(null);

  const setRef = React.useCallback(
    (node: PopoverPrimitive.TriggerRef | null) => {
      trigger.current = node;

      return forwardTriggerRef(ref, node);
    },
    [ref],
  );

  return { trigger, setRef };
}

function forwardTriggerRef(
  ref: TriggerProps['ref'],
  node: PopoverPrimitive.TriggerRef | null,
): void | (() => void) {
  if (typeof ref === 'function') return ref(node);

  if (ref) ref.current = node;
}

export function PopoverHoverGroup({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}

export function usePopoverClose(): () => void {
  const { onOpenChange } = PopoverPrimitive.useRootContext();

  return React.useCallback(() => onOpenChange(false), [onOpenChange]);
}

const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function PopoverContent(content: ContentProps): React.JSX.Element | null {
  const { portalHost, onClosed, ...props } = content;
  const { open } = PopoverPrimitive.useRootContext();
  const { mounted, style } = usePopoverDismissal(open, onClosed);

  if (!mounted) return null;

  return (
    <PopoverPrimitive.Portal hostName={portalHost} forceMount>
      <WindowPopover style={style}>
        <PopoverSurface {...props} />
      </WindowPopover>
    </PopoverPrimitive.Portal>
  );
}

function PopoverOverlay({
  children,
  style,
}: {
  children?: React.ReactNode;
  style: ReturnType<typeof usePopoverDismissal>['style'];
}): React.JSX.Element {
  return (
    <PopoverPrimitive.Overlay {...overlayProps}>
      <NativeOnlyAnimatedView style={style} as="Pressable">
        {children}
      </NativeOnlyAnimatedView>
    </PopoverPrimitive.Overlay>
  );
}

type SurfaceProps = Omit<ContentProps, 'portalHost' | 'onClosed'>;

function PopoverSurface({
  children,
  ...props
}: SurfaceProps): React.JSX.Element {
  return (
    <PopoverPrimitive.Content {...surfaceProps(props)}>
      <TextClassContext.Provider value="text-card-foreground">
        <OverlayFields value>{children}</OverlayFields>
      </TextClassContext.Provider>
    </PopoverPrimitive.Content>
  );
}

type PrimitiveContentProps = React.ComponentProps<
  typeof PopoverPrimitive.Content
>;

function surfaceProps({
  className,
  align = 'center',
  sideOffset = 4,
  side,
  ...props
}: SurfaceProps): PrimitiveContentProps {
  const placement = { align, sideOffset, side: nativeSide(side) };

  return {
    forceMount: true,
    ...placement,
    className: cn(surfaceClass, className),
    ...props,
  };
}

// The library opens anything but `top` below the trigger.
function nativeSide(side: SurfaceProps['side']): PrimitiveContentProps['side'] {
  if (side === undefined) return undefined;

  return side === 'top' ? 'top' : 'bottom';
}

export { Popover, PopoverContent, PopoverTrigger };

function WindowPopover(
  props: React.ComponentProps<typeof PopoverOverlay>,
): React.JSX.Element {
  return (
    <FullWindowOverlay>
      <PopoverOverlay {...props} />
    </FullWindowOverlay>
  );
}

const overlayProps = {
  style: StyleSheet.absoluteFill,
  asChild: true,
  forceMount: true,
} satisfies React.ComponentProps<typeof PopoverPrimitive.Overlay>;

const surfaceClass =
  'bg-card border-border z-50 w-72 rounded-2xl border p-4 shadow-md shadow-black/5';

Popover satisfies React.ComponentType<PopoverProps>;

PopoverContent satisfies React.ComponentType<ContentProps>;

PopoverTrigger satisfies React.ComponentType<TriggerProps>;
