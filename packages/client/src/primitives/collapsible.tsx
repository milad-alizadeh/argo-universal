import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '#lib/utils';

const OpenContext = createContext(false);

// Set inside a list that places rows from their measured size, such as the Feed: the height then steps from JS and re-measures the row each frame, so the rows below move with it.
interface CollapsibleLayoutSync {
  syncLayout: () => void;
  // Called with true as a collapsible starts to open or close and false once it stops, so the list can tell a reader's toggle from new content.
  onMotionChange: (moving: boolean) => void;
}
const CollapsibleLayoutSyncContext =
  createContext<CollapsibleLayoutSync | null>(null);

function Collapsible({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Root>, 'asChild'>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  return (
    <OpenContext.Provider value={open}>
      <CollapsiblePrimitive.Root
        {...props}
        open={open}
        onOpenChange={(nextOpen) => {
          if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }}
      >
        {children}
      </CollapsiblePrimitive.Root>
    </OpenContext.Provider>
  );
}

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

function CollapsibleContent({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Content>, 'asChild'>) {
  const layoutSync = useContext(CollapsibleLayoutSyncContext);
  if (layoutSync)
    return (
      <LayoutSyncedContent
        {...props}
        className={className}
        layoutSync={layoutSync}
      >
        {children}
      </LayoutSyncedContent>
    );
  if (Platform.OS === 'web') {
    return (
      <CollapsiblePrimitive.Content
        {...props}
        className={cn(
          'overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:animate-none',
          className,
        )}
      >
        {children}
      </CollapsiblePrimitive.Content>
    );
  }
  return (
    <NativeContent {...props} className={className}>
      {children}
    </NativeContent>
  );
}

const duration = 200;
// Reanimated's default `withTiming` curve, so both paths move alike.
const easeInOut = Easing.inOut(Easing.quad);

function LayoutSyncedContent({
  children,
  className,
  forceMount,
  layoutSync: { syncLayout, onMotionChange },
  ...props
}: Omit<
  React.ComponentProps<typeof CollapsiblePrimitive.Content>,
  'asChild'
> & { layoutSync: CollapsibleLayoutSync }) {
  const open = useContext(OpenContext);
  const reducedMotion = useReducedMotion();
  const [contentHeight, setContentHeight] = useState(0);
  const [progress, setProgress] = useState(open ? 1 : 0);
  const latestProgress = useRef(progress);
  latestProgress.current = progress;
  useEffect(() => {
    const target = open ? 1 : 0;
    // Opening waits for the first measurement, which sets the height to grow to.
    if (open && contentHeight === 0) return;
    if (reducedMotion) {
      setProgress(target);
      return;
    }
    const from = latestProgress.current;
    const remainingDuration = Math.abs(target - from) * duration;
    if (!remainingDuration) {
      setProgress(target);
      return;
    }
    onMotionChange(true);
    let moving = true;
    const startTime = performance.now();
    let frame = requestAnimationFrame(function step(time) {
      const elapsedFraction = Math.min(
        (time - startTime) / remainingDuration,
        1,
      );
      setProgress(from + (target - from) * easeInOut(elapsedFraction));
      if (elapsedFraction < 1) frame = requestAnimationFrame(step);
      else {
        moving = false;
        onMotionChange(false);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (moving) onMotionChange(false);
    };
  }, [open, contentHeight, reducedMotion, onMotionChange]);
  // Before paint, so the list moves the rows below in the same frame.
  useLayoutEffect(() => {
    syncLayout();
  }, [progress, contentHeight, syncLayout]);
  if (!open && progress === 0 && !forceMount) return null;
  return (
    <CollapsiblePrimitive.Content {...props} forceMount asChild>
      <View
        style={{ height: contentHeight * progress, overflow: 'hidden' }}
        pointerEvents={open ? 'auto' : 'none'}
        aria-hidden={!open}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      >
        <View
          className={className}
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          onLayout={(event) =>
            setContentHeight(event.nativeEvent.layout.height)
          }
        >
          {children}
        </View>
      </View>
    </CollapsiblePrimitive.Content>
  );
}

function NativeContent({
  children,
  className,
  forceMount,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Content>, 'asChild'>) {
  const open = useContext(OpenContext);
  const [mounted, setMounted] = useState(open || !!forceMount);
  const height = useSharedValue(0);
  const progress = useSharedValue(open ? 1 : 0);
  const visibility = useRef({ open, forceMount });
  visibility.current = { open, forceMount };
  const unmountClosedContent = useCallback(() => {
    if (visibility.current.open || visibility.current.forceMount) return;
    height.value = 0;
    setMounted(false);
  }, [height]);
  useEffect(() => {
    if (open) {
      setMounted(true);
      if (height.value > 0)
        progress.value = withTiming(1, {
          duration,
          reduceMotion: ReduceMotion.System,
        });
    } else {
      progress.value = withTiming(
        0,
        { duration, reduceMotion: ReduceMotion.System },
        (finished) => {
          if (finished && !forceMount) {
            runOnJS(unmountClosedContent)();
          }
        },
      );
    }
    return () => cancelAnimation(progress);
  }, [open, forceMount, height, progress, unmountClosedContent]);
  const style = useAnimatedStyle(
    () => ({ height: height.value * progress.value, overflow: 'hidden' }),
    [height, progress],
  );
  if (!mounted && !forceMount) return null;
  return (
    <CollapsiblePrimitive.Content {...props} forceMount asChild>
      <Animated.View
        style={style}
        pointerEvents={open ? 'auto' : 'none'}
        aria-hidden={!open}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      >
        <View
          className={className}
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          onLayout={(event) => {
            const firstMeasurement = height.value === 0;
            height.value = event.nativeEvent.layout.height;
            if (open && firstMeasurement)
              progress.value = withTiming(1, {
                duration,
                reduceMotion: ReduceMotion.System,
              });
          }}
        >
          {children}
        </View>
      </Animated.View>
    </CollapsiblePrimitive.Content>
  );
}

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleLayoutSyncContext,
  CollapsibleTrigger,
};
