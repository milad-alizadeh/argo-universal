import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { motionDuration } from '#lib/generic/motion';
import {
  NativeOnlyAnimatedView,
  usePresentationClosed,
} from '#lib/generic/primitives/native-only-animated-view';
import { TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  portalHost,
  children,
  onClosed,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
  onClosed?: () => void;
}) {
  const { open } = PopoverPrimitive.useRootContext();
  const { mounted, style } = usePopoverDismissal(open, onClosed);
  if (!mounted) return null;
  return (
    <PopoverPrimitive.Portal hostName={portalHost} forceMount>
      <FullWindowOverlay>
        <PopoverPrimitive.Overlay
          style={StyleSheet.absoluteFill}
          asChild
          forceMount
        >
          <NativeOnlyAnimatedView style={style} as="Pressable">
            <PopoverPrimitive.Content
              forceMount
              align={align}
              sideOffset={sideOffset}
              className={cn(
                'bg-popover border-border z-50 w-72 rounded-md border p-4 shadow-md shadow-black/5',
                className,
              )}
              {...props}
            >
              <TextClassContext.Provider value="text-popover-foreground">
                {children}
              </TextClassContext.Provider>
            </PopoverPrimitive.Content>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </FullWindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

function usePopoverDismissal(open: boolean, onClosed?: () => void) {
  const [mounted, setMounted] = React.useState(open);
  if (open && !mounted) setMounted(true);
  const visibility = React.useRef(open);
  const opacity = useSharedValue(0);
  React.useLayoutEffect(() => {
    visibility.current = open;
  }, [open]);
  const finishDismissal = React.useCallback(() => {
    if (!visibility.current) setMounted(false);
  }, []);
  React.useEffect(() => {
    opacity.set(
      withTiming(
        open ? 1 : 0,
        {
          duration: open ? motionDuration.enter : motionDuration.exit,
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished && !open) runOnJS(finishDismissal)();
        },
      ),
    );
    return () => cancelAnimation(opacity);
  }, [open, opacity, finishDismissal]);
  usePresentationClosed(mounted, onClosed);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return { mounted, style };
}

export { Popover, PopoverContent, PopoverTrigger };
