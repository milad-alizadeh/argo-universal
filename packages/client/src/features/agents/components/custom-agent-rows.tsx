import type * as React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { Icon } from '../../../lib/generic/symbols/icon';

export type CustomAgentRowEntry = { id: string; name: string };
type RowProps = { onOpen: (agentId: string) => void };
type OneRowProps = RowProps & { agent: CustomAgentRowEntry };
type RowsProps = RowProps & { agents: CustomAgentRowEntry[] };

export function CustomAgentRows({
  agents,
  onOpen,
}: RowsProps): React.JSX.Element | null {
  if (agents.length === 0) return null;
  return (
    <View role="list" accessibilityLabel="Custom Agents" className="pt-6">
      {agents.map((agent) => (
        <CustomAgentRow key={agent.id} agent={agent} onOpen={onOpen} />
      ))}
    </View>
  );
}

function CustomAgentRow(props: OneRowProps): React.JSX.Element {
  return (
    <Pressable
      role="link"
      accessibilityLabel={props.agent.name}
      onPress={() => props.onOpen(props.agent.id)}
      className="flex-row items-center gap-3 pb-6 wide:gap-4"
    >
      <AgentTile />
      <RowText name={props.agent.name} />
      <PhoneChevron />
    </Pressable>
  );
}

// Desktop rows carry no chevron, as in Paper.
function PhoneChevron(): React.JSX.Element {
  return (
    <Icon
      name="chevron-right"
      size="sm"
      className="text-muted-foreground wide:hidden"
    />
  );
}

function AgentTile(): React.JSX.Element {
  return (
    <View className="size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
      <Icon name="agent" className="text-foreground" />
    </View>
  );
}

function RowText({ name }: { name: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text role="body" className="min-h-6">
        {name}
      </Text>
      <Text role="secondary">Custom ACP program</Text>
    </View>
  );
}
