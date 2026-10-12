import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { TextClassContext } from '#lib/generic/primitives/display/text/text';
import { NativeOnlyAnimatedView } from '#lib/generic/primitives/native/native-only-animated-view/native-only-animated-view';
import { cn } from '#lib/generic/utils';
import { usePopoverDismissal } from './popover-dismissal';

function Popover({
  openOnHover: _openOnHover,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root> & {
  openOnHover?: boolean;
}): React.JSX.Element {
  return <PopoverPrimitive.Root {...props} />;
}
export function PopoverHoverGroup({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}
const PopoverTrigger = PopoverPrimitive.Trigger;

export function usePopoverClose(): () => void {
  const { onOpenChange } = PopoverPrimitive.useRootContext();
  return React.useCallback(() => onOpenChange(false), [onOpenChange]);
}
const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;
type ContentProps = React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
  onClosed?: () => void;
};

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

type SurfaceProps = React.ComponentProps<typeof PopoverPrimitive.Content>;

function PopoverSurface({
  children,
  ...props
}: SurfaceProps): React.JSX.Element {
  return (
    <PopoverPrimitive.Content {...surfaceProps(props)}>
      <TextClassContext.Provider value="text-popover-foreground">
        {children}
      </TextClassContext.Provider>
    </PopoverPrimitive.Content>
  );
}

function surfaceProps({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: SurfaceProps): SurfaceProps {
  return {
    forceMount: true,
    align,
    sideOffset,
    className: cn(surfaceClass, className),
    ...props,
  };
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
  'bg-popover border-border z-50 w-72 rounded-2xl border p-4 shadow-md shadow-black/5';
