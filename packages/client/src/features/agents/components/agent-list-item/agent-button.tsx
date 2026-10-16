import type * as React from 'react';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { Button } from '#primitives/buttons/button';
import { IconButton } from '#primitives/buttons/icon-button';
import type { AgentRowEntry } from '../../state/agent-list';

export type AgentActions = {
  onInstall: (id: string) => void;
  onRemove: (id: string) => void;
};

export type AgentCardProps = AgentActions & { agent: AgentRowEntry };

type State = 'install' | 'remove' | 'unavailable';

const actions: Record<
  State,
  { label: string; icon: IconName; tone?: 'danger'; disabled?: boolean }
> = {
  install: { label: 'Install', icon: 'add' },
  remove: { label: 'Remove', icon: 'delete', tone: 'danger' },
  unavailable: { label: 'Unavailable', icon: 'unavailable', disabled: true },
};

const stateOf = (agent: AgentRowEntry): State => {
  if (agent.installed) return 'remove';

  return agent.unavailable ? 'unavailable' : 'install';
};

type ButtonProps = AgentCardProps & { wide: boolean };

export function AgentButton(props: ButtonProps): React.JSX.Element {
  return props.wide ? (
    <DesktopAgentButton {...props} />
  ) : (
    <PhoneAgentButton {...props} />
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
      disabled={action.disabled}
      variant={state === 'remove' ? 'ghost' : 'default'}
      onPress={() => onPress(props)}
    />
  );
}

const phoneLabel = (props: AgentCardProps): string =>
  stateOf(props.agent) === 'unavailable'
    ? 'Not supported on this platform'
    : `${actions[stateOf(props.agent)].label} ${props.agent.name}`;

function PhoneAgentButton(props: AgentCardProps): React.JSX.Element {
  const action = actions[stateOf(props.agent)];

  return (
    <IconButton
      icon={action.icon}
      tone={action.tone}
      disabled={action.disabled}
      accessibilityLabel={phoneLabel(props)}
      variant="ghost"
      onPress={() => onPress(props)}
    />
  );
}
