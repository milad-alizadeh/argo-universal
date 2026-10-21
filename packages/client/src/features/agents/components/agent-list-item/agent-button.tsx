import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type { IconName } from '@repo/kit/symbols/icon-names';
import type * as React from 'react';
import { Platform, View } from 'react-native';
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

export const unsupportedLabel = 'Not supported on this platform';

// The phone's trailing status icon and desktop's meta note share one glyph.
export const unavailableIcon: IconName = 'unavailable';

// The card's one trailing item, its glyph flush with the card's padding as the logo is on the other side.
export function AgentButton(props: AgentCardProps): React.JSX.Element {
  if (props.agent.unavailable) return <UnavailableStatus />;

  return <ActionButton {...props} />;
}

// Desktop names the status in words; a phone shows an icon whose label says why.
function UnavailableStatus(): React.JSX.Element {
  return (
    <SizeClass
      compact={<UnavailableIcon />}
      wide={
        <Text role="row" tone="muted">
          Unavailable
        </Text>
      }
    />
  );
}

const unavailableRole = Platform.OS === 'android' ? 'row' : 'action';

function UnavailableIcon(): React.JSX.Element {
  return (
    <View accessible accessibilityLabel={unsupportedLabel}>
      <Icon name={unavailableIcon} role={unavailableRole} tone="muted" />
    </View>
  );
}

const onPress = (props: AgentCardProps): void =>
  (props.agent.installed ? props.onRemove : props.onInstall)(props.agent.id);

function ActionButton(props: AgentCardProps): React.JSX.Element {
  const action = actions[stateOf(props.agent)];

  return (
    <IconButton
      icon={action.icon}
      tone={action.tone}
      accessibilityLabel={`${action.label} ${props.agent.name}`}
      variant="ghost"
      bleed
      onPress={() => onPress(props)}
    />
  );
}
