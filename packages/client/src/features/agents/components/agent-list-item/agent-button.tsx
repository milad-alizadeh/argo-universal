import type * as React from 'react';
import { Platform, View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import type { AgentRowEntry } from '../../utils/agent-rows';

export type AgentActions = {
  onInstall: (id: string) => void;
  onRemove: (id: string) => void;
};

export type AgentCardProps = AgentActions & { agent: AgentRowEntry };

type State = 'install' | 'remove';

const actions: Record<
  State,
  { label: string; icon: IconName; tone?: 'danger' }
> = {
  install: { label: 'Install', icon: 'add' },
  remove: { label: 'Remove', icon: 'delete', tone: 'danger' },
};

const stateOf = (agent: AgentRowEntry): State =>
  agent.installed ? 'remove' : 'install';

export function AgentButton(props: AgentCardProps): React.JSX.Element {
  return (
    <View className="w-11 items-center android:w-12">{accessory(props)}</View>
  );
}

function accessory(props: AgentCardProps): React.JSX.Element {
  if (props.agent.unavailable) return <UnavailableIcon />;

  return <PhoneAgentButton {...props} />;
}

const unavailableRole = Platform.OS === 'android' ? 'row' : 'action';

function UnavailableIcon(): React.JSX.Element {
  return (
    <View accessible accessibilityLabel="Not supported on this platform">
      <Icon name="unavailable" role={unavailableRole} tone="muted" />
    </View>
  );
}

const onPress = (props: AgentCardProps): void =>
  (props.agent.installed ? props.onRemove : props.onInstall)(props.agent.id);

function PhoneAgentButton(props: AgentCardProps): React.JSX.Element {
  const action = actions[stateOf(props.agent)];

  return (
    <IconButton
      icon={action.icon}
      tone={action.tone}
      accessibilityLabel={`${action.label} ${props.agent.name}`}
      variant="ghost"
      onPress={() => onPress(props)}
    />
  );
}
