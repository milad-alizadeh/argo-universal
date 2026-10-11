import type * as React from 'react';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { motionDuration, quarterTurnDegrees } from '#lib/generic/motion';
import { cn } from '#lib/generic/utils';
import { Icon } from '../../../lib/generic/symbols/icon';

export function DisclosureCaret({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}): React.JSX.Element {
  const rotation = useDerivedValue(
    () =>
      withTiming(open ? quarterTurnDegrees : 0, {
        duration: motionDuration.enter,
        reduceMotion: ReduceMotion.System,
      }),
    [open],
  );
  const style = useAnimatedStyle(
    () => ({ transform: [{ rotate: `${rotation.value}deg` }] }),
    [rotation],
  );
  return (
    <Animated.View style={style} className="shrink-0">
      <Icon
        size="xs"
        name="chevron-right"
        className={cn('text-muted-foreground', className)}
      />
    </Animated.View>
  );
}
