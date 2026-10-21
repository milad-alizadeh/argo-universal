import { Icon, IconSlot } from '@repo/kit/primitives/content/icon';
import { TextClassContext } from '@repo/kit/primitives/content/text';
import { TintedAvatar } from '@repo/kit/tinted-avatar';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { subagentRoleMark } from '../../../../lib/product/subagents/subagent-role';
import type { FeedSubagent } from '../../view/feed-view';
import {
  rowColour,
  rowLabel,
  SpawnPrompt,
  SubagentLine,
} from './subagent-line';

export interface SubagentRowProps {
  item: FeedSubagent;
  // Opens the Subagent's Feed: the Inspector's Subagents tab on a wide window, the Sheet on a phone.
  onOpen?: (subagentSessionId: string) => void;
}

// A Messaged row leads with the message bubble, a Replied row with the reply arrow.
const markIcons = { messaged: 'message', replied: 'reply' } as const;

// The leading slot is one line box wide at every kind, so the three rows share a lane.
function SubagentLead({ item }: { item: FeedSubagent }): React.JSX.Element {
  if (item.kind === 'started')
    return <TintedAvatar {...subagentRoleMark(item.role)} size="inline" />;

  return (
    <IconSlot role="row">
      <Icon name={markIcons[item.kind]} role="body" />
    </IconSlot>
  );
}

interface RowBodyProps {
  item: FeedSubagent;
  opens: boolean;
}

// The avatar or mark leads the line of words; a Started row's prompt follows underneath.
function RowBody({ item, opens }: RowBodyProps): React.JSX.Element {
  return (
    <>
      <View className="flex-row items-center gap-1.5">
        <SubagentLead item={item} />
        <SubagentLine item={item} opens={opens} />
      </View>
      <SpawnPrompt item={item} />
    </>
  );
}

const rowClassName =
  'max-w-full self-start web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2';

interface RowPressProps extends SubagentRowProps {
  onHoveredChange: (hovered: boolean) => void;
}

const openRow = ({ item, onOpen }: RowPressProps): (() => void) | undefined =>
  onOpen ? () => onOpen(item.subagentSessionId) : undefined;

const pressProps = (
  props: RowPressProps,
): React.ComponentProps<typeof Pressable> => ({
  role: 'button',
  accessibilityLabel: rowLabel(props.item),
  onPress: openRow(props),
  onHoverIn: () => props.onHoveredChange(true),
  onHoverOut: () => props.onHoveredChange(false),
  className: rowClassName,
});

// Without an opener the row is only its words: assistive technology is offered no button to press.
function RowPressable(props: RowPressProps): React.JSX.Element {
  if (!props.onOpen)
    return (
      <View className="max-w-full self-start">
        <RowBody item={props.item} opens={false} />
      </View>
    );

  return (
    <Pressable {...pressProps(props)}>
      <RowBody item={props.item} opens />
    </Pressable>
  );
}

// One `subagent_update` action. Tapping it opens the Subagent's Feed, as its Subagents list row does.
export function SubagentRow({
  item,
  onOpen,
}: SubagentRowProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <TextClassContext.Provider value={rowColour(hovered)}>
      <RowPressable item={item} onOpen={onOpen} onHoveredChange={setHovered} />
    </TextClassContext.Provider>
  );
}
