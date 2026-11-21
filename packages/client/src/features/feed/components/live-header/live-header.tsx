import type {
  LiveHeaderSource,
  LiveHeader as LiveHeaderValue,
  ToolCallUpdate,
} from '@repo/contracts';
import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import { formatElapsed, millisecondsPerSecond } from '@repo/kit/format-elapsed';
import { fullTurnDegrees } from '@repo/kit/motion';
import { Icon, IconSlot } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import { useClock } from '@repo/kit/use-clock';
import type * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { toolCallFacts } from '../../view/feed-row-facts';
import { FeedOrb } from '../feed-orb';
import { ShimmerText } from '../shimmer-text';
import { toolCallOrb } from '../tool-call-orb';

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
      <Icon name="retry" className="text-muted-foreground" />
    </Animated.View>
  );
}

function toolSourceIcon(toolCall?: ToolCallUpdate): React.JSX.Element {
  const operation = toolCall && toolCallFacts(toolCall).operation;

  return operation ? (
    <Icon name={operation.icon} className="text-muted-foreground" />
  ) : (
    <FeedOrb size="sm" state={toolCallOrb(toolCall)} continues />
  );
}

const sourceIcons: Record<
  LiveHeaderSource['type'],
  (toolCall: ToolCallUpdate | undefined) => React.JSX.Element
> = {
  request: () => <StatusDot testID="live-header-dot" tone="warning" pulse />,
  retry: () => <RetryIcon />,
  working: () => <FeedOrb size="sm" continues />,
  thought: () => <FeedOrb size="sm" state="solving" continues />,
  tool_call: toolSourceIcon,
};

export function SourceIcon({
  source,
  toolCall,
}: Pick<LiveHeaderProps, 'toolCall'> & {
  source: LiveHeaderSource;
}): React.JSX.Element {
  return sourceIcons[source.type](toolCall);
}

function operationTitle(toolCall?: ToolCallUpdate): string | undefined {
  return toolCall ? toolCallFacts(toolCall).operation?.label : undefined;
}

export function useLiveHeaderTitle(
  { text, startedAt }: LiveHeaderValue,
  now: number | undefined,
  toolCall?: ToolCallUpdate,
): string {
  const title = operationTitle(toolCall) ?? text;

  const clock = useClock(startedAt !== null, now);

  if (startedAt === null) return title;

  return `${title} ${formatElapsed(clock - startedAt)}`;
}

function RequestTitle({ title }: { title: string }): React.JSX.Element {
  return (
    <Text
      numberOfLines={1}
      role="body"
      tone="muted"
      className="min-w-0 shrink font-sans"
    >
      {title}
    </Text>
  );
}

function LiveTitle({
  title,
  source,
}: {
  title: string;
  source: LiveHeaderSource;
}): React.JSX.Element {
  return source.type === 'request' ? (
    <RequestTitle title={title} />
  ) : (
    <ShimmerText text={title} className="min-w-0 shrink type-body" />
  );
}

// The last line of the Feed while a Turn runs; its source icon marks a request, otherwise the title shimmers.
export function LiveHeader(props: LiveHeaderProps): React.JSX.Element {
  const { liveHeader } = props;
  const title = useLiveHeaderTitle(liveHeader, props.now, props.toolCall);

  return (
    <View role="status" accessibilityLabel={title} className={rowClassName}>
      <IconSlot>
        <SourceIcon source={liveHeader.source} toolCall={props.toolCall} />
      </IconSlot>
      <LiveTitle title={title} source={liveHeader.source} />
    </View>
  );
}
