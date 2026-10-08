import * as ProgressPrimitive from '@rn-primitives/progress';
import { Platform, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { cn } from '#lib/utils';

const fullPercent = 100;
// The narrowest the native bar draws, so an empty bar still shows.
const minimumPercent = 1;

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      <Indicator value={value} className={indicatorClassName} />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

const Indicator = Platform.select({
  web: WebIndicator,
  native: NativeIndicator,
  default: NullIndicator,
});

type IndicatorProps = {
  value: number | undefined | null;
  className?: string;
};

function WebIndicator({ value, className }: IndicatorProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      className={cn(
        'bg-primary h-full w-full flex-1 transition-all',
        className,
      )}
      style={{ transform: `translateX(-${fullPercent - (value ?? 0)}%)` }}
    >
      <ProgressPrimitive.Indicator className={cn('h-full w-full', className)} />
    </View>
  );
}

function NativeIndicator({ value, className }: IndicatorProps) {
  const progress = useDerivedValue(() => value ?? 0);

  const indicator = useAnimatedStyle(() => {
    return {
      width: withSpring(
        `${interpolate(
          progress.value,
          [0, fullPercent],
          [minimumPercent, fullPercent],
          Extrapolation.CLAMP,
        )}%`,
        { overshootClamping: true },
      ),
    };
  }, [value]);

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <ProgressPrimitive.Indicator asChild>
      <Animated.View
        style={indicator}
        className={cn('bg-foreground h-full', className)}
      />
    </ProgressPrimitive.Indicator>
  );
}

function NullIndicator(_props: IndicatorProps) {
  return null;
}
