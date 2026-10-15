import type * as React from 'react';
import { Button } from '#primitives/buttons/button';
import type { ButtonProps } from '#primitives/buttons/button';
import { GroupedListContent } from '#primitives/lists/grouped-list-content';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import { installationActive } from '../../state/agent-install-phase';
import type { AgentStatus } from '../../state/agent-status';
import { AgentInstallControl } from '../agent-install-control/agent-install-control';
import { AgentRemoval } from '../agent-management/agent-removal';

type ActionProps = Pick<
  AgentDetailViewProps,
  'agent' | 'onInstall' | 'onUpdate' | 'installation'
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
  if (props.installation)
    return <InstallationAction {...props} installation={props.installation} />;
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

const showsInstallation = (
  props: ActionProps,
  installation: NonNullable<ActionProps['installation']>,
): boolean =>
  ['not-installed', 'update'].includes(props.agent.status) ||
  installationActive(installation);

function InstallationAction(
  props: ActionProps & {
    installation: NonNullable<ActionProps['installation']>;
  },
): React.JSX.Element | null {
  if (!showsInstallation(props, props.installation)) return null;

  return (
    <AgentInstallControl
      agent={props.agent}
      installation={props.installation}
    />
  );
}

/*
 * A destructive button with no card around it, and what removing does: small on wide windows, full width on a phone.
 * GroupedList takes it as a direct child, so this is called rather than rendered.
 */
export function removeAgent(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  if (props.agent.status === 'not-installed') return null;

  return (
    <GroupedListContent key="remove">
      <AgentRemoval
        name={props.agent.name}
        onRemove={props.onRemove}
        busy={props.management?.busy}
      />
    </GroupedListContent>
  );
}
