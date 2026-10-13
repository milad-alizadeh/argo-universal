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
import {
  formatElapsed,
  millisecondsPerSecond,
} from '#lib/generic/format-elapsed';
import { fullTurnDegrees } from '#lib/generic/motion';
import { Text } from '#lib/generic/primitives/display/text/text';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { useClock } from '#lib/generic/use-clock';
import { StatusIndicator } from '#lib/product/status-indicator/status-indicator';
import { Icon, IconSlot } from '../../../../lib/generic/symbols/icon';
import { ShimmerText } from '../shimmer-text';
import { toolCallIcon } from '../tool-call-icon';
import { WorkingMark } from '../working-mark';

const rowClassName = 'w-full flex-row items-center gap-1.5';

export interface LiveHeaderProps {
  // `SessionSnapshot.liveHeader`, the Server's one line for what the Agent is doing.
  liveHeader: LiveHeaderValue;
  // The Feed row named by a `tool_call` source, for its icon.
  toolCall?: ToolCallUpdate;
  // Fixes the clock, for stories and tests.
  now?: number;
}

const spin = (): number =>
  withRepeat(
    withTiming(fullTurnDegrees, {
      duration: millisecondsPerSecond,
      easing: Easing.linear,
    }),
    -1,
  );

type RotationStyle = ReturnType<
  typeof useAnimatedStyle<{ transform: { rotate: string }[] }>
>;

function useRetryRotation(): RotationStyle {
  const rotation = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!reducedMotion) rotation.set(spin());
    return (): void => cancelAnimation(rotation);
  }, [reducedMotion, rotation]);
  return useAnimatedStyle(
    () => ({ transform: [{ rotate: `${rotation.get()}deg` }] }),
    [rotation],
  );
}

// The retry arrow turns once a second, and holds still under reduced motion.
function RetryIcon(): React.JSX.Element {
  return (
    <Animated.View testID="live-header-retry" style={useRetryRotation()}>
      <Icon name="retry" role="body" className="text-muted-foreground" />
    </Animated.View>
  );
}

const mutedIcon = (name: IconName): React.JSX.Element => (
  <Icon name={name} role="body" className="text-muted-foreground" />
);

const sourceIcons: Record<
  LiveHeaderSource['type'],
  (toolCall: ToolCallUpdate | undefined) => React.JSX.Element
> = {
  request: () => (
    <StatusIndicator testID="live-header-dot" status="needs_input" />
  ),
  retry: () => <RetryIcon />,
  working: () => <WorkingMark />,
  thought: () => mutedIcon('thinking'),
  tool_call: (toolCall) =>
    mutedIcon(toolCall ? toolCallIcon(toolCall) : 'tool'),
};

function SourceIcon({
  source,
  toolCall,
}: Pick<LiveHeaderProps, 'toolCall'> & {
  source: LiveHeaderSource;
}): React.JSX.Element {
  return sourceIcons[source.type](toolCall);
}

function useTitle(
  { text, startedAt }: LiveHeaderValue,
  now: number | undefined,
): string {
  const clock = useClock(startedAt !== null, now);
  if (startedAt === null) return text;
  return `${text} ${formatElapsed(clock - startedAt)}`;
}

function LiveTitle({
  title,
  source,
}: {
  title: string;
  source: LiveHeaderSource;
}): React.JSX.Element {
  if (source.type !== 'request')
    return <ShimmerText text={title} className="min-w-0 shrink type-body" />;
  return (
    <Text numberOfLines={1} role="body" className="min-w-0 shrink text-warning">
      {title}
    </Text>
  );
}

// The last line of the Feed while a Turn runs; it waits on you in amber, otherwise it shimmers.
export function LiveHeader(props: LiveHeaderProps): React.JSX.Element {
  const { liveHeader } = props;
  const title = useTitle(liveHeader, props.now);
  return (
    <View role="status" accessibilityLabel={title} className={rowClassName}>
      <IconSlot role="body">
        <SourceIcon source={liveHeader.source} toolCall={props.toolCall} />
      </IconSlot>
      <LiveTitle title={title} source={liveHeader.source} />
    </View>
  );
}
