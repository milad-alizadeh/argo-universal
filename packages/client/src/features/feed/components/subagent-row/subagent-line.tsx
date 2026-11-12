import { Text } from '@repo/kit/primitives/content/text';
import { Chevron } from '@repo/kit/primitives/status/chevron';
import type * as React from 'react';
import { View } from 'react-native';
import type { FeedSubagent } from '../../view/feed-view';

// Each action is only its fact: "Started Explore", "Messaged Explore", "Explore replied". What was said is in the
// Agent's own Feed, one press away (#1997).
const words = {
  started: (title: string) => `Started ${title}`,
  messaged: (title: string) => `Messaged ${title}`,
  replied: (title: string) => `${title} replied`,
} as const;

// A clamped line shrinks with the box around it, so the lane keeps its width while the words give way.
function ClampedLine({
  text,
  className,
}: {
  text: string;
  className: string;
}): React.JSX.Element {
  return (
    <View className={className}>
      <Text numberOfLines={1} selectable={false}>
        {text}
      </Text>
    </View>
  );
}

/*
 * The chevron promises the Subagent's Feed, so it is drawn only where the row can open it. It is the chevron the
 * Feed's collapsible rows draw.
 */
function RowChevron({ opens }: { opens: boolean }): React.JSX.Element | null {
  if (!opens) return null;

  return <Chevron direction="right" />;
}

export function SubagentLine({
  item,
  opens,
}: {
  item: FeedSubagent;
  opens: boolean;
}): React.JSX.Element {
  return (
    <View className="min-w-0 shrink flex-row items-center gap-1">
      <ClampedLine text={rowLabel(item)} className="min-w-0 shrink" />
      <RowChevron opens={opens} />
    </View>
  );
}

// The row's words, which assistive technology reads too.
export const rowLabel = (item: FeedSubagent): string =>
  words[item.kind](item.title);

// Feed rows carry no fill: like a Tool call's header, the row turns from muted to foreground under the pointer.
export const rowColour = (hovered: boolean): string =>
  hovered ? 'text-foreground' : 'text-muted-foreground';
