import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import type { ButtonProps } from '../../../../lib/generic/primitives/buttons/button/button-props';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import type { AgentStatus } from '../../state/agent-status';

type ActionProps = Pick<
  AgentDetailViewProps,
  'agent' | 'onInstall' | 'onUpdate'
> &
  Pick<ButtonProps, 'fullWidth'>;
interface ActionButton {
  label: string;
  onPress?: () => void;
}

const statusActions = (
  handlers: ActionProps,
): Partial<Record<AgentStatus, ActionButton>> => ({
  'not-installed': { label: 'Install', onPress: handlers.onInstall },
  update: { label: 'Update', onPress: handlers.onUpdate },
});

// Install or Update, whichever the Agent needs; without a handler the Server cannot do it yet.
export function AgentAction(props: ActionProps): React.JSX.Element | null {
  const action = statusActions(props)[props.agent.status];
  if (!action) return null;
  return (
    <Button
      size="sm"
      fullWidth={props.fullWidth}
      label={action.label}
      onPress={action.onPress}
      disabled={!action.onPress}
    />
  );
}

// A destructive button with no card around it, and what removing does: small on wide windows, full width on a phone.
export function RemoveAgent(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  if (props.agent.status === 'not-installed') return null;
  return (
    <View className="items-stretch gap-2 wide:items-start">
      <RemoveButton {...props} />
      <Text role="secondary" className="px-4 wide:px-0">
        Uninstalls it from the Server. Past Sessions keep their history.
      </Text>
    </View>
  );
}

function RemoveButton(props: AgentDetailViewProps): React.JSX.Element {
  const { name } = props.agent;
  return (
    <Button
      size="sm"
      fullWidth="narrow"
      label={useWide() ? `Remove ${name}` : `Remove ${name} Agent`}
      variant="outline"
      role="destructive"
      onPress={props.onRemove}
      disabled={!props.onRemove}
    />
  );
}
