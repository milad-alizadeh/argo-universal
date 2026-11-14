import { TextClassContext } from '@repo/kit/primitives/content/text';
import { TintedAvatar } from '@repo/kit/tinted-avatar';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  type AgentIdentity,
  subagentMarkLabel,
  subagentRoleMark,
} from '../../../../lib/product/subagents/subagent-role';
import type { FeedSubagent } from '../../view/feed-view';
import { rowColour, rowLabel, SubagentLine } from './subagent-line';

export interface SubagentRowProps {
  item: FeedSubagent;
  // Opens the Subagent's Feed: the Inspector's Subagents tab on a wide window, the Sheet on a phone.
  onOpen?: (subagentSessionId: string) => void;
}

// Every action leads with the Agent's role mark, the one its Inspector and Workbench rows draw, sized to the line.
function SubagentLead({ agent }: { agent: AgentIdentity }): React.JSX.Element {
  return (
    <TintedAvatar
      {...subagentRoleMark(agent)}
      accessibilityLabel={subagentMarkLabel(agent)}
      size="inline"
    />
  );
}

interface RowBodyProps {
  item: FeedSubagent;
  opens: boolean;
}

// The mark leads one line of words.
function RowBody({ item, opens }: RowBodyProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5">
      <SubagentLead agent={item} />
      <SubagentLine item={item} opens={opens} />
    </View>
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
