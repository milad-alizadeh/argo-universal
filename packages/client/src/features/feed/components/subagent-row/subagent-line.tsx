import { Icon, IconSlot } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import type { FeedSubagent } from '../../view/feed-view';

// Paper words each action: "Started Explore", "Messaged Explore “…”", "Explore replied “…”".
const verbs = { started: 'Started', messaged: 'Messaged' } as const;

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

const quoted = (text: string | undefined): string => (text ? ` “${text}”` : '');

// Paper words each action, and the whole line clamps at its end so the title never gives way first.
function lineWords(item: FeedSubagent): string {
  if (item.kind === 'replied')
    return `${item.title} replied${quoted(item.text)}`;

  if (item.kind === 'messaged')
    return `${verbs.messaged} ${item.title}${quoted(item.text)}`;

  return `${verbs.started} ${item.title}`;
}

// The chevron promises the Subagent's Feed, so it is drawn only where the row can open it.
function RowChevron({ opens }: { opens: boolean }): React.JSX.Element | null {
  if (!opens) return null;

  return (
    <IconSlot size="sm">
      <Icon name="disclosure" size="sm" />
    </IconSlot>
  );
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
      <ClampedLine text={lineWords(item)} className="min-w-0 shrink" />
      <RowChevron opens={opens} />
    </View>
  );
}

// The prompt the child began on, under its title and in the title's lane.
export function SpawnPrompt({
  item,
}: {
  item: FeedSubagent;
}): React.JSX.Element | null {
  if (item.kind !== 'started' || !item.text) return null;

  return (
    <View className="flex-row items-start gap-1.5">
      <IconSlot size="md" />
      <ClampedLine text={item.text} className="min-w-0 flex-1" />
    </View>
  );
}

// What assistive technology reads: the row's words, and the prompt a Started row draws beneath them.
export const rowLabel = (item: FeedSubagent): string =>
  [lineWords(item), item.kind === 'started' ? item.text : '']
    .filter(Boolean)
    .join(', ');

// Feed rows carry no fill: like a Tool call's header, the row turns from muted to foreground under the pointer.
export const rowColour = (hovered: boolean): string =>
  hovered ? 'text-foreground' : 'text-muted-foreground';
