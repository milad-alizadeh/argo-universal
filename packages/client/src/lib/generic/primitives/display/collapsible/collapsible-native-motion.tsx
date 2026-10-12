import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { duration } from './collapsible-context';

interface NativeMotion {
  height: SharedValue<number>;
  progress: SharedValue<number>;
}
interface NativeVisibility {
  open: boolean;
  forceMount?: boolean;
}
function openContent(motion: NativeMotion): void {
  motion.progress.set(
    withTiming(1, { duration, reduceMotion: ReduceMotion.System }),
  );
}
function closeContent(
  progress: SharedValue<number>,
  forceMount: boolean | undefined,
  unmount: () => void,
): void {
  progress.set(
    withTiming(
      0,
      { duration, reduceMotion: ReduceMotion.System },
      (finished) => {
        if (finished && !forceMount) runOnJS(unmount)();
      },
    ),
  );
}
function animateNativeContent(
  options: NativeVisibility & NativeMotion & { unmount: () => void },
): () => void {
  if (!options.open)
    closeContent(options.progress, options.forceMount, options.unmount);
  else if (options.height.get() > 0) openContent(options);
  return () => cancelAnimation(options.progress);
}
function isInitiallyMounted(visibility: NativeVisibility): boolean {
  return visibility.open || !!visibility.forceMount;
}
function useLatestVisibility(
  visibility: NativeVisibility,
): RefObject<NativeVisibility> {
  const { open, forceMount } = visibility;
  const latest = useRef(visibility);
  useLayoutEffect(() => {
    latest.current = { open, forceMount };
  }, [open, forceMount]);
  return latest;
}
function useNativeMount(
  visibility: NativeVisibility,
  height: SharedValue<number>,
): { mounted: boolean; unmount: () => void } {
  const [mounted, setMounted] = useState(isInitiallyMounted(visibility));
  const latest = useLatestVisibility(visibility);
  if (visibility.open && !mounted) setMounted(true);
  const unmount = useCallback(() => {
    if (isInitiallyMounted(latest.current)) return;
    height.set(0);
    setMounted(false);
  }, [height, latest]);
  return { mounted, unmount };
}
function measureNativeContent(
  event: LayoutChangeEvent,
  motion: NativeMotion,
  open: boolean,
): void {
  const firstMeasurement = motion.height.get() === 0;
  motion.height.set(event.nativeEvent.layout.height);
  if (open && firstMeasurement) openContent(motion);
}
type NativeContentMotion = NativeMotion & {
  mounted: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
};
export function useNativeContentMotion(
  visibility: NativeVisibility,
): NativeContentMotion {
  const height = useSharedValue(0);
  const progress = useSharedValue(visibility.open ? 1 : 0);
  const { mounted, unmount } = useNativeMount(visibility, height);
  const { open, forceMount } = visibility;
  useEffect(
    () => animateNativeContent({ open, forceMount, height, progress, unmount }),
    [open, forceMount, height, progress, unmount],
  );
  return nativeMotionResult({ height, progress }, mounted, open);
}
function nativeMotionResult(
  motion: NativeMotion,
  mounted: boolean,
  open: boolean,
): NativeContentMotion {
  return {
    ...motion,
    mounted,
    onLayout: (event) => measureNativeContent(event, motion, open),
  };
}
