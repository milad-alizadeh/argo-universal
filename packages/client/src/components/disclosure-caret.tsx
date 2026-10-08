import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import type * as React from 'react';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { motionDuration, quarterTurnDegrees } from '#lib/motion';
import { cn } from '#lib/utils';
import { Icon } from './icon';

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
        size="sm"
        as={CaretRightIcon}
        className={cn('text-muted-foreground', className)}
      />
    </Animated.View>
  );
}
