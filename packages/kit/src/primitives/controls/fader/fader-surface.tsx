import { useEffect, useState, type ReactElement } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '#kit/utils';
import { useSkeletonLoading } from '#primitives/status/skeleton';
import { Adjustable } from './fader-adjustable';
import { Gradient } from './fader-gradient';
import { fractionOf } from './fader-math';
import type { FaderProps } from './fader-props';
import type { FaderValue } from './fader-value';

type Orientation = NonNullable<FaderProps['orientation']>;

// The unfilled part is the fill's first colour at this opacity.
const unfilledOpacity = 0.18;

const fullPercent = 100;

const tint = (fill: readonly string[]): ViewStyle => ({
  backgroundColor: fill[0],
  opacity: unfilledOpacity,
});

const fillEdges = {
  vertical: { left: 0, right: 0, bottom: 0 },
  horizontal: { top: 0, bottom: 0, start: 0 },
} as const satisfies Record<Orientation, ViewStyle>;

const fillTiming = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

// Without colours the unfilled part is the muted surface.
function Unfilled(props: Pick<FaderProps, 'fill'>): ReactElement {
  return (
    <View
      className={cn('absolute inset-0', !props.fill && 'bg-muted')}
      style={props.fill && tint(props.fill)}
    />
  );
}

interface FillProps extends Pick<FaderProps, 'fill'> {
  orientation: Orientation;
  share: number;
  hasPendingValue: boolean;
}

// Without colours the fill is the accent tone.
function Fill({
  fill,
  orientation,
  share,
  hasPendingValue,
}: FillProps): ReactElement {
  const progress = useSharedValue(share);
  const [previousFill, setPreviousFill] = useState(fill);

  // Retain the gradient while it drains when a light switches off.
  if (share > 0 && previousFill !== fill) setPreviousFill(fill);

  const colours = share === 0 ? previousFill : fill;

  useEffect(() => {
    progress.set(hasPendingValue ? share : withTiming(share, fillTiming));
  }, [hasPendingValue, progress, share]);

  const size = useAnimatedStyle(() => {
    const percent: `${number}%` = `${progress.get() * fullPercent}%`;

    return orientation === 'vertical'
      ? { height: percent }
      : { width: percent };
  });

  return (
    <Animated.View
      pointerEvents="none"
      className={cn('absolute', !colours && 'bg-accent')}
      style={[fillEdges[orientation], size]}
    >
      {colours ? <Gradient fill={colours} orientation={orientation} /> : null}
    </Animated.View>
  );
}

export type SurfaceProps = FaderProps & {
  orientation: Orientation;
  control: FaderValue;
};

// The unfilled part, the fill and the adjustable element, behind the content.
export function Surface(props: SurfaceProps): ReactElement {
  const loading = useSkeletonLoading();

  if (loading) return <Unfilled />;

  const share = fractionOf(props.control.value, props);

  return (
    <View className="absolute inset-0">
      <Unfilled fill={props.fill} />
      <Fill
        fill={props.fill}
        orientation={props.orientation}
        share={share}
        hasPendingValue={props.control.hasPendingValue}
      />
      <Adjustable {...props} />
    </View>
  );
}
