import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '#lib/utils';

const NativeOpenContext = createContext(false);

function Collapsible({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Root>, 'asChild'>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  if (Platform.OS === 'web')
    return (
      <CollapsiblePrimitive.Root
        {...props}
        open={controlledOpen}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      >
        {children}
      </CollapsiblePrimitive.Root>
    );
  return (
    <NativeOpenContext.Provider value={open}>
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
    </NativeOpenContext.Provider>
  );
}

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

function CollapsibleContent({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Content>, 'asChild'>) {
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

function NativeContent({
  children,
  className,
  forceMount,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Content>, 'asChild'>) {
  const open = useContext(NativeOpenContext);
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

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
