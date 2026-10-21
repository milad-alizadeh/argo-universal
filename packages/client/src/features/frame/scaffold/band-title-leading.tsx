import { useEffect, useRef, type ReactElement } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import { bezierEasing } from '#lib/generic/bezier-easing';
import type { FrameMotion } from '../utils/frame-timing';

export interface BandTitleLeadingProps extends FrameMotion {
  width: number;
}

export function BandTitleLeading(props: BandTitleLeadingProps): ReactElement {
  const width = useSharedValue(props.width);
  const previous = useRef(props.transitionKey);
  useEffect(() => {
    width.set(
      props.animate && previous.current !== props.transitionKey
        ? withTiming(props.width, {
            duration: props.timing.duration,
            easing: bezierEasing(props.timing.curve),
            reduceMotion: ReduceMotion.System,
          })
        : props.width,
    );
    previous.current = props.transitionKey;
  }, [props, width]);
  const style = useAnimatedStyle(() => ({ width: width.get() }));

  return (
    <Animated.View
      testID="band-title-leading"
      className="shrink-0"
      style={style}
    />
  );
}
