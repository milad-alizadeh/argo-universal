import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '#lib/utils';
import { Icon } from './Icon';

export function DisclosureCaret({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  const rotation = useDerivedValue(
    () =>
      withTiming(open ? 90 : 0, {
        duration: 200,
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
