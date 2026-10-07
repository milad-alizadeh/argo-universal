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

// Set inside a list that places rows from their measured size, such as the Feed: the height then steps from JS and resizes the row each frame, so the rows below move with it.
interface CollapsibleLayoutSync {
  syncLayout: () => void;
  // Called with true as a collapsible starts to open or close and false once it stops, so the list can tell a reader's toggle from new content.
  onMotionChange: (moving: boolean) => void;
  // Grows the row in the list by a height, in the same frame the content steps, so the rows below keep pace.
  grow: (height: number) => void;
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
// Tall content takes longer, so each frame moves the rows below a short way.
const durationPerPoint = 0.6;
const longestDuration = 400;
const durationFor = (height: number) =>
  Math.min(longestDuration, Math.max(duration, height * durationPerPoint));
// Reanimated's default `withTiming` curve, so both paths move alike.
const easeInOut = Easing.inOut(Easing.quad);

function LayoutSyncedContent({
  children,
  className,
  forceMount,
  layoutSync: { syncLayout, onMotionChange, grow },
  ...props
}: Omit<
  React.ComponentProps<typeof CollapsiblePrimitive.Content>,
  'asChild'
> & { layoutSync: CollapsibleLayoutSync }) {
  const open = useContext(OpenContext);
  const reducedMotion = useReducedMotion();
  // A ref, so content resizing inside a still, open collapsible costs no render; a nested collapsible moving would otherwise render this one every frame.
  const contentHeight = useRef(0);
  const [measured, setMeasured] = useState(false);
  const [progress, setProgress] = useState(open ? 1 : 0);
  const latestProgress = useRef(progress);
  latestProgress.current = progress;
  useEffect(() => {
    const target = open ? 1 : 0;
    // Opening waits for the first measurement, which sets the height to grow to.
    if (open && !measured) return;
    if (reducedMotion) {
      setProgress(target);
      return;
    }
    const from = latestProgress.current;
    const height = contentHeight.current;
    const remainingDuration = Math.abs(target - from) * durationFor(height);
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
      const nextProgress = from + (target - from) * easeInOut(elapsedFraction);
      grow(height * (nextProgress - latestProgress.current));
      latestProgress.current = nextProgress;
      setProgress(nextProgress);
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
  }, [open, measured, reducedMotion, onMotionChange, grow]);
  // `grow` moves the rows below each frame; once still, the list measures the row before paint.
  const stillAt = progress === 0 || progress === 1 ? progress : null;
  useLayoutEffect(() => {
    syncLayout();
  }, [stillAt, measured, syncLayout]);
  if (!open && progress === 0 && !forceMount) return null;
  // Open and still, the content takes its own height, so a collapsible nested in it resizes the row in the same layout.
  const settled = open && progress === 1;
  return (
    <CollapsiblePrimitive.Content {...props} forceMount asChild>
      <View
        style={
          settled
            ? undefined
            : { height: contentHeight.current * progress, overflow: 'hidden' }
        }
        pointerEvents={open ? 'auto' : 'none'}
        aria-hidden={!open}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      >
        <View
          className={className}
          style={settled ? undefined : movingContentStyle}
          onLayout={(event) => {
            contentHeight.current = event.nativeEvent.layout.height;
            setMeasured(true);
          }}
        >
          {children}
        </View>
      </View>
    </CollapsiblePrimitive.Content>
  );
}

const movingContentStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
} as const;

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
