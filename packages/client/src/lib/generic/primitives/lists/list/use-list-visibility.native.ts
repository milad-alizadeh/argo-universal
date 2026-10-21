import { useCallback, useState } from 'react';
import { useWindowDimensions, type View } from 'react-native';
import {
  measure,
  runOnJS,
  useAnimatedRef,
  useFrameCallback,
  useSharedValue,
  type AnimatedRef,
  type MeasuredDimensions,
} from 'react-native-reanimated';
import type { ListVisibility } from './list-visibility';

type Screen = ReturnType<typeof useWindowDimensions>;

// Native measures on the UI thread; React updates only when a shelf enters or leaves the screen.
export function useListVisibility(): ListVisibility {
  const ref = useAnimatedRef<View>();
  const visible = useScreenVisibility(ref);

  const attach = useCallback(
    (node: View | null): void => {
      ref(node);
    },
    [ref],
  );

  return { visible, attach };
}

function useScreenVisibility(ref: AnimatedRef<View>): boolean {
  const screen = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  useVisibilityFrame(ref, screen, setVisible);

  return visible;
}

function useVisibilityFrame(
  ref: AnimatedRef<View>,
  screen: Screen,
  report: (visible: boolean) => void,
): void {
  const current = useSharedValue(false);

  useFrameCallback(() => {
    const next = onScreen(measure(ref), screen);

    if (current.get() === next) return;
    current.set(next);
    runOnJS(report)(next);
  });
}

function onScreen(box: MeasuredDimensions | null, screen: Screen): boolean {
  'worklet';

  if (!box) return false;

  return hasArea(box) && intersects(box, screen);
}

function hasArea(box: MeasuredDimensions): boolean {
  'worklet';

  return box.width > 0 && box.height > 0;
}

function intersects(box: MeasuredDimensions, screen: Screen): boolean {
  'worklet';

  return (
    horizontalIntersection(box, screen.width) &&
    verticalIntersection(box, screen.height)
  );
}

function horizontalIntersection(
  box: MeasuredDimensions,
  width: number,
): boolean {
  'worklet';

  return box.pageX < width && box.pageX + box.width > 0;
}

function verticalIntersection(
  box: MeasuredDimensions,
  height: number,
): boolean {
  'worklet';

  return box.pageY < height && box.pageY + box.height > 0;
}
