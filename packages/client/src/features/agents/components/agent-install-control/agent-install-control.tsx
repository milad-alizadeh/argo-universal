import type * as React from 'react';
import { Button } from '#primitives/buttons/button';
import { Alert } from '#primitives/overlays/alert';
import type { AgentDetail } from '../../state/agent-detail-types';
import type {
  AgentInstallPresentation,
  InstallAction,
} from '../../state/agent-install-types';

type ControlProps = {
  agent: AgentDetail;
  installation: AgentInstallPresentation;
};

const progressLabels: Record<InstallAction, string> = {
  Install: 'Installing…',
  Update: 'Updating…',
};

// Install or Update asks first, then shows its progress in place until the Server settles it.
export function AgentInstallControl(props: ControlProps): React.JSX.Element {
  return (
    <>
      <InstallButton {...props.installation} />
      <InstallConfirmation {...props} />
    </>
  );
}

function InstallButton(
  installation: AgentInstallPresentation,
): React.JSX.Element {
  const { action, installing } = installation;

  return (
    <Button
      size="sm"
      fullWidth="narrow"
      label={installing ? progressLabels[action] : action}
      loading={installing}
      onPress={() => installation.onConfirmingChange(true)}
    />
  );
}

const distributionName = (agent: AgentDetail): string | undefined =>
  agent.distribution?.split(' · ')[0] || undefined;

const releaseLine = (props: ControlProps): string =>
  [`Version ${props.installation.version}`, distributionName(props.agent)]
    .filter(Boolean)
    .join(' · ');

const confirmationMessage = (props: ControlProps): string =>
  `${releaseLine(props)}. Installs on ${props.installation.server ?? 'the connected Server'}. Sign-in is checked separately.`;

function InstallConfirmation(props: ControlProps): React.JSX.Element {
  const { installation, agent } = props;

  return (
    <Alert
      open={installation.confirming}
      onOpenChange={installation.onConfirmingChange}
      title={`${installation.action} ${agent.name}?`}
      message={confirmationMessage(props)}
      actions={[
        { label: 'Cancel', role: 'cancel' },
        { label: installation.action, onPress: installation.onInstall },
      ]}
    />
  );
}
