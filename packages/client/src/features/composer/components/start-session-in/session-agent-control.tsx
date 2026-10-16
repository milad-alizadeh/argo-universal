import type * as React from 'react';
import { View } from 'react-native';
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
      pageHeader
      label="Select Agent"
      trigger={agentTrigger(props)}
    >
      {(close) => <AgentChoices {...props} close={close} />}
    </ComposerPopover>
  );
}

function agentTrigger(props: StartSessionInProps): React.JSX.Element {
  const current = props.agents.find(({ id }) => id === props.agent);

  return (
    <MenuTrigger
      icon="agent"
      label={current?.name ?? 'Select Agent'}
      accessibilityLabel="Select Agent"
      disabled={props.disabled}
    />
  );
}
