import type { ToolCallUpdate } from '@repo/contracts';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { BrainIcon } from 'phosphor-react-native/src/icons/Brain';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { formatElapsed } from '../feed/format-elapsed';
import { useClock } from '../feed/use-clock';
import { BlinkingDot } from './BlinkingDot';
import { Icon } from './Icon';
import { ShimmerText } from './ShimmerText';
import { toolCallIcon } from './tool-call-icon';

// Which step of the Server's live header order produced the text.
export type LiveHeaderSource =
  | { type: 'request' }
  | { type: 'retry' }
  | { type: 'thought' }
  | { type: 'tool_call'; row: ToolCallUpdate }
  | { type: 'working' };

export interface LiveHeaderProps {
  // `SessionSnapshot.liveHeader`, the Server's one line for what the Agent is doing.
  text: string;
  source: LiveHeaderSource;
  // When the running Turn started, in epoch milliseconds.
  startedAt: number;
  // Fixes the clock, for stories and tests.
  now?: number;
}

function sourceIcon(source: LiveHeaderSource) {
  switch (source.type) {
    case 'retry':
      return ArrowClockwiseIcon;
    case 'thought':
      return BrainIcon;
    case 'tool_call':
      return toolCallIcon(source.row);
    default:
      return SparkleIcon;
  }
}

// The last line of the Feed while a Turn runs; it waits on you in amber, otherwise it shimmers.
export function LiveHeader({ text, source, startedAt, now }: LiveHeaderProps) {
  const clock = useClock(true, now);
  const title = `${text} ${formatElapsed(clock - startedAt)}`;
  const request = source.type === 'request';
  return (
    <View
      role="status"
      accessibilityLabel={title}
      className="h-5 w-full flex-row items-center gap-1.5"
    >
      <View className="size-4 shrink-0 items-center justify-center">
        {request ? (
          <BlinkingDot
            testID="live-header-dot"
            colorClassName="bg-warning"
            className="size-2"
          />
        ) : (
          <Icon
            as={sourceIcon(source)}
            className="size-4 text-muted-foreground"
          />
        )}
      </View>
      {request ? (
        <Text
          numberOfLines={1}
          className="min-w-0 shrink text-sm leading-5 text-warning"
        >
          {title}
        </Text>
      ) : (
        <ShimmerText
          text={title}
          className="min-w-0 shrink text-sm leading-5 text-foreground"
        />
      )}
    </View>
  );
}
