import type {
  LiveHeaderSource,
  LiveHeader as LiveHeaderValue,
  ToolCallUpdate,
} from '@repo/contracts';
import type * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { fullTurnDegrees } from '#lib/motion';
import { Text } from '#primitives/text';
import { formatElapsed, millisecondsPerSecond } from '../feed/format-elapsed';
import { useClock } from '../feed/use-clock';
import { Icon } from '../lib/icon';
import { ShimmerText } from './shimmer-text';
import { StatusIndicator } from './status-indicator';
import { toolCallIcon } from './tool-call-icon';
import { WorkingMark } from './working-mark';

export interface LiveHeaderProps {
  // `SessionSnapshot.liveHeader`, the Server's one line for what the Agent is doing.
  liveHeader: LiveHeaderValue;
  // The Feed row named by a `tool_call` source, for its icon.
  toolCall?: ToolCallUpdate;
  // Fixes the clock, for stories and tests.
  now?: number;
}

// The retry arrow turns once a second, and holds still under reduced motion.
function RetryIcon(): React.JSX.Element {
  const rotation = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!reducedMotion)
      rotation.set(
        withRepeat(
          withTiming(fullTurnDegrees, {
            duration: millisecondsPerSecond,
            easing: Easing.linear,
          }),
          -1,
        ),
      );
    return (): void => cancelAnimation(rotation);
  }, [reducedMotion, rotation]);
  const style = useAnimatedStyle(
    () => ({ transform: [{ rotate: `${rotation.get()}deg` }] }),
    [rotation],
  );
  return (
    <Animated.View testID="live-header-retry" style={style}>
      <Icon name="retry" className="text-muted-foreground" />
    </Animated.View>
  );
}

function SourceIcon({
  source,
  toolCall,
}: {
  source: LiveHeaderSource;
  toolCall?: ToolCallUpdate;
}): React.JSX.Element {
  switch (source.type) {
    case 'request':
      return <StatusIndicator testID="live-header-dot" status="needs_input" />;
    case 'retry':
      return <RetryIcon />;
    case 'working':
      return <WorkingMark />;
    case 'thought':
      return <Icon name="thinking" className="text-muted-foreground" />;
    case 'tool_call':
      return (
        <Icon
          name={toolCall ? toolCallIcon(toolCall) : 'tool'}
          className="text-muted-foreground"
        />
      );
  }
}

// The last line of the Feed while a Turn runs; it waits on you in amber, otherwise it shimmers.
export function LiveHeader({
  liveHeader,
  toolCall,
  now,
}: LiveHeaderProps): React.JSX.Element {
  const { text, source, startedAt } = liveHeader;
  const clock = useClock(startedAt !== null, now);
  const title =
    startedAt === null ? text : `${text} ${formatElapsed(clock - startedAt)}`;
  const request = source.type === 'request';
  return (
    <View
      role="status"
      accessibilityLabel={title}
      className="w-full flex-row items-center gap-1.5"
    >
      <View className="size-4 shrink-0 items-center justify-center">
        <SourceIcon source={source} toolCall={toolCall} />
      </View>
      {request ? (
        <Text
          numberOfLines={1}
          className="min-w-0 shrink type-body text-warning"
        >
          {title}
        </Text>
      ) : (
        <ShimmerText text={title} className="min-w-0 shrink type-body" />
      )}
    </View>
  );
}
