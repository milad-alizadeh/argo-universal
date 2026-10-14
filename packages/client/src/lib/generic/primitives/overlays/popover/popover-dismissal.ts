import * as React from 'react';
import {
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { motionDuration } from '#lib/generic/motion';
import { usePresentationClosed } from '#primitives/native/native-only-animated-view';

// Whether the popover is in the tree, kept there until it has faded out.
interface PopoverPresence {
  mounted: boolean;
  style: ReturnType<typeof useAnimatedStyle<{ opacity: number }>>;
}

export function usePopoverDismissal(
  open: boolean,
  onClosed?: () => void,
): PopoverPresence {
  const [mounted, setMounted] = React.useState(open);

  if (open && !mounted) setMounted(true);
  const finishDismissal = useDismissalCompletion(open, setMounted);
  const opacity = usePopoverOpacity(open, finishDismissal);
  usePresentationClosed(mounted, onClosed);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return { mounted, style };
}

function useDismissalCompletion(
  open: boolean,
  setMounted: (mounted: boolean) => void,
): () => void {
  const visibility = React.useRef(open);
  React.useLayoutEffect(() => {
    visibility.current = open;
  }, [open]);

  return React.useCallback(() => {
    if (!visibility.current) setMounted(false);
  }, [setMounted]);
}

function usePopoverOpacity(
  open: boolean,
  finishDismissal: () => void,
): SharedValue<number> {
  const opacity = useSharedValue(0);
  React.useEffect(
    () => animateOpacity({ opacity, open, finishDismissal }),
    [open, opacity, finishDismissal],
  );

  return opacity;
}

type OpacityAnimation = {
  opacity: SharedValue<number>;
  open: boolean;
  finishDismissal: () => void;
};

function animateOpacity({
  opacity,
  open,
  finishDismissal,
}: OpacityAnimation): () => void {
  const timing = opacityTiming(open);
  opacity.set(
    withTiming(open ? 1 : 0, timing, (finished) => {
      if (finished && !open) runOnJS(finishDismissal)();
    }),
  );

  return (): void => cancelAnimation(opacity);
}

interface OpacityTiming {
  duration: number;
  reduceMotion: ReduceMotion;
}

function opacityTiming(open: boolean): OpacityTiming {
  return {
    duration: open ? motionDuration.enter : motionDuration.exit,
    reduceMotion: ReduceMotion.System,
  };
}
