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
  onMotion: (moving: boolean) => void;
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
      <SyncedContent {...props} className={className} layoutSync={layoutSync}>
        {children}
      </SyncedContent>
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
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

function SyncedContent({
  children,
  className,
  forceMount,
  layoutSync: { syncLayout, onMotion },
  ...props
}: Omit<
  React.ComponentProps<typeof CollapsiblePrimitive.Content>,
  'asChild'
> & { layoutSync: CollapsibleLayoutSync }) {
  const open = useContext(OpenContext);
  const reducedMotion = useReducedMotion();
  const [height, setHeight] = useState(0);
  const [progress, setProgress] = useState(open ? 1 : 0);
  const current = useRef(progress);
  current.current = progress;
  useEffect(() => {
    const target = open ? 1 : 0;
    // Opening waits for the first measurement, which sets the height to grow to.
    if (open && height === 0) return;
    if (reducedMotion) {
      setProgress(target);
      return;
    }
    const from = current.current;
    const span = Math.abs(target - from) * duration;
    if (!span) {
      setProgress(target);
      return;
    }
    onMotion(true);
    let moving = true;
    const started = performance.now();
    let frame = requestAnimationFrame(function step(time) {
      const t = Math.min((time - started) / span, 1);
      setProgress(from + (target - from) * easeInOut(t));
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        moving = false;
        onMotion(false);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (moving) onMotion(false);
    };
  }, [open, height, reducedMotion, onMotion]);
  // Before paint, so the list moves the rows below in the same frame.
  useLayoutEffect(() => {
    syncLayout();
  }, [progress, height, syncLayout]);
  if (!open && progress === 0 && !forceMount) return null;
  return (
    <CollapsiblePrimitive.Content {...props} forceMount asChild>
      <View
        style={{ height: height * progress, overflow: 'hidden' }}
        pointerEvents={open ? 'auto' : 'none'}
        aria-hidden={!open}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      >
        <View
          className={className}
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
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
          duration: 200,
          reduceMotion: ReduceMotion.System,
        });
    } else {
      progress.value = withTiming(
        0,
        { duration: 200, reduceMotion: ReduceMotion.System },
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
                duration: 200,
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
