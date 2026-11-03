import {
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAnimatedStyle } from '../../../animated-hooks';
import {
  CollapsibleContext,
  contentAccessibility,
  duration,
} from './collapsible-context';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';

const timing = { duration, reduceMotion: ReduceMotion.System };

// The content lies out of the flow at its own height, which the clipping view reaches as it opens.
const measuredStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
} as const;

interface Motion {
  height: SharedValue<number>;
  progress: SharedValue<number>;
  unmount: () => void;
}

function move(motion: Motion, open: boolean): void {
  motion.progress.set(
    withTiming(open ? 1 : 0, timing, (finished) => {
      if (finished && !open) runOnJS(motion.unmount)();
    }),
  );
}

function useMounted(open: boolean): [boolean, () => void] {
  const [mounted, setMounted] = useState(open);

  if (open && !mounted) setMounted(true);

  return [mounted, useCallback(() => setMounted(false), [])];
}

// Reanimated's measured accordion: the UI thread draws height × progress, so content that changes size is followed.
function useMotion(open: boolean): Motion & { mounted: boolean } {
  const height = useSharedValue(0);
  const progress = useSharedValue(open ? 1 : 0);
  const [mounted, unmount] = useMounted(open);

  useEffect(() => {
    // Opening for the first time waits for the content's measurement.
    if (!open || height.get() > 0) move({ height, progress, unmount }, open);
  }, [open, height, progress, unmount]);

  return { height, progress, unmount, mounted };
}

function measure(
  motion: Motion,
  open: boolean,
  event: LayoutChangeEvent,
): void {
  const first = motion.height.get() === 0;

  motion.height.set(event.nativeEvent.layout.height);

  if (open && first) move(motion, open);
}

function useClip({
  height,
  progress,
}: Motion): ReturnType<
  typeof useAnimatedStyle<{ height: number; overflow: 'hidden' }>
> {
  return useAnimatedStyle(
    () => ({ height: height.get() * progress.get(), overflow: 'hidden' }),
    [height, progress],
  );
}

interface NativeContent {
  mounted: boolean;
  clip: ReturnType<typeof useClip>;
  onLayout: (event: LayoutChangeEvent) => void;
}

function useNativeContent(open: boolean): NativeContent {
  const motion = useMotion(open);
  const clip = useClip(motion);

  return {
    mounted: motion.mounted,
    clip,
    onLayout: (event) => measure(motion, open, event),
  };
}

export function DrawnContent(props: ContentProps): ReactElement | null {
  const { forceMount, ...view } = props;
  const { open } = useContext(CollapsibleContext);
  const { mounted, clip, onLayout } = useNativeContent(open);

  if (!mounted && !forceMount) return null;

  return (
    <Animated.View style={clip} {...contentAccessibility(open)}>
      <View {...view} style={[view.style, measuredStyle]} onLayout={onLayout} />
    </Animated.View>
  );
}
