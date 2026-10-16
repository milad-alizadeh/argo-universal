import type * as React from 'react';
import { View } from 'react-native';
import { RegistryIcon } from '#features/agents';
import { MenuTrigger } from '#primitives/overlays/menu';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { AgentChoices } from './agent-picker-choices';
import type {
  StartSessionInProps,
  StartSessionLayout,
} from './start-session-types';

export function SessionAgentControl({
  props,
  wide,
}: StartSessionLayout): React.JSX.Element {
  const picker = <AgentPicker {...props} />;

  return wide ? picker : <View className="px-4">{picker}</View>;
}

function AgentPicker(props: StartSessionInProps): React.JSX.Element {
  return (
    <ComposerPopover
      listContent
      label="Select Agent"
      width={260}
      contentClassName="composer-popover bg-card rounded-2xl border-0 p-2 gap-2 overflow-hidden"
      trigger={agentTrigger(props)}
    >
      {(close) => <AgentChoices {...props} close={close} />}
    </ComposerPopover>
  );
}

function agentTrigger(props: StartSessionInProps): React.JSX.Element {
  const current = props.agents.find(({ id }) => id === props.agent);

  return <MenuTrigger {...agentTriggerProps(current, props.disabled)} />;
}

function agentTriggerProps(
  current: StartSessionInProps['agents'][number] | undefined,
  disabled: boolean | undefined,
): React.ComponentProps<typeof MenuTrigger> {
  return {
    icon: agentIcon(current),
    leading: selectedAgentIcon(current),
    label: current?.name ?? 'Select Agent',
    accessibilityLabel: 'Select Agent',
    disabled,
  };
}

function agentIcon(
  current: StartSessionInProps['agents'][number] | undefined,
): 'agent' | undefined {
  return current ? undefined : 'agent';
}

function selectedAgentIcon(
  current: StartSessionInProps['agents'][number] | undefined,
): React.JSX.Element | undefined {
  if (!current) return undefined;

  return (
    <RegistryIcon uri={current.icon} agentName={current.name} role="control" />
  );
}
