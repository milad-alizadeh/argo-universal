import type * as React from 'react';
import { Platform, View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { Button } from '#primitives/buttons/button';
import { IconButton } from '#primitives/buttons/icon-button';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import type { AgentRowEntry } from '../../state/agent-rows';

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

type ButtonProps = AgentCardProps & { wide: boolean };

export function AgentButton(props: ButtonProps): React.JSX.Element {
  return (
    <View className="w-11 items-center android:w-12 wide:w-27.25 wide:items-end">
      {accessory(props)}
    </View>
  );
}

function accessory(props: ButtonProps): React.JSX.Element {
  if (props.agent.unavailable) return <Unavailable wide={props.wide} />;

  return props.wide ? (
    <DesktopAgentButton {...props} />
  ) : (
    <PhoneAgentButton {...props} />
  );
}

function Unavailable({ wide }: { wide: boolean }): React.JSX.Element {
  return wide ? (
    <Text role="body" tone="muted">
      Unavailable
    </Text>
  ) : (
    <UnavailableIcon />
  );
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

function DesktopAgentButton(props: AgentCardProps): React.JSX.Element {
  const state = stateOf(props.agent),
    action = actions[state];

  return (
    <Button
      label={action.label}
      tone={action.tone}
      variant={state === 'remove' ? 'ghost' : 'default'}
      onPress={() => onPress(props)}
    />
  );
}

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
