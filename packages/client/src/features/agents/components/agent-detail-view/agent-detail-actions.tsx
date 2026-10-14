import type * as React from 'react';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import type { ButtonProps } from '../../../../lib/generic/primitives/buttons/button/button-props';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import { installationActive } from '../../state/agent-install-phase';
import { type AgentStatus, isInstalled } from '../../state/agent-status';
import { AgentInstallControl } from '../agent-install-control/agent-install-control';
import { AgentRemoval } from '../agent-management/agent-removal';
import {
  DisableOutsideCopy,
  isOutsideCopy,
  UpdateOutsideCopy,
} from '../agent-management/outside-copy';

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
  'update-available': { label: 'Update', onPress: handlers.onUpdate },
});

const updatesOutside = ({ agent }: ActionProps): boolean =>
  agent.status === 'update-available' && isOutsideCopy(agent);

// Install or Update, whichever the Agent needs; a copy Argo did not install updates through its owner.
export function AgentAction(props: ActionProps): React.JSX.Element | null {
  if (!updatesOutside(props)) return <ArgoAction {...props} />;

  return (
    <UpdateOutsideCopy
      agent={props.agent}
      server={props.installation?.server}
      fullWidth={props.fullWidth}
    />
  );
}

// Without a handler the Server cannot do it yet.
function ArgoAction(props: ActionProps): React.JSX.Element | null {
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
  ['not-installed', 'update-available'].includes(props.agent.status) ||
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

// A destructive button with no card around it, and what removing does: small on wide windows, full width on a phone. A copy Argo did not install offers Disable instead.
export function RemoveAgent(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  if (!isInstalled(props.agent)) return null;

  return isOutsideCopy(props.agent) ? (
    <DisableOutsideCopy agent={props.agent} management={props.management} />
  ) : (
    <ArgoRemoval {...props} />
  );
}

function ArgoRemoval(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <AgentRemoval
      name={props.agent.name}
      onRemove={props.onRemove}
      busy={props.management?.busy}
    />
  );
}
