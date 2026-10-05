import type { SessionInfo } from '@repo/contracts';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';

export const statusLabels = {
  needs_input: 'Needs input',
  running: 'Running',
  failed: 'Failed',
  unread: 'Unread',
  idle: 'Idle',
} satisfies Record<SessionInfo['status'], string>;

const statusColors = {
  needs_input: 'bg-warning',
  running: 'bg-success',
  failed: 'bg-destructive',
  unread: 'bg-info',
  idle: 'bg-muted-foreground',
} satisfies Record<SessionInfo['status'], string>;

export interface StatusIndicatorProps {
  status: SessionInfo['status'];
  size?: 'default' | 'small';
  className?: string;
  testID?: string;
}

export function StatusIndicator({
  status,
  size = 'default',
  className,
  testID = 'status-indicator',
}: StatusIndicatorProps) {
  const active = status === 'running' || status === 'needs_input';
  const { backgroundColor } = useResolveClassNames(statusColors[status]);
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = active
      ? withRepeat(withTiming(0.45, { duration: 650 }), -1, true)
      : 1;
    return () => cancelAnimation(opacity);
  }, [active, opacity]);
  const lightStyle = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
      boxShadow: active
        ? [
            {
              offsetX: 0,
              offsetY: 0,
              blurRadius: 4,
              spreadDistance: 0,
              color: backgroundColor,
            },
          ]
        : [],
    }),
    [opacity, active, backgroundColor],
  );
  return (
    <View
      testID={`${testID}-container`}
      accessibilityLabel={statusLabels[status]}
      className={cn(
        'shrink-0 rounded-full border-2 border-background',
        size === 'small' ? 'size-2' : 'size-2.5',
        className,
      )}
    >
      <Animated.View
        testID={testID}
        style={lightStyle}
        className={cn('size-full rounded-full', statusColors[status])}
      />
    </View>
  );
}
