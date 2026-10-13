import type * as React from 'react';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import type { AgentDetail } from '../../state/agent-detail-types';
import type { AgentInstallPresentation } from '../../state/agent-install-types';
import { AgentInstallAlert } from './agent-install-alert';
import { AgentInstallSheet } from './agent-install-sheet';
type ControlProps = {
  agent: AgentDetail;
  installation: AgentInstallPresentation;
};
const failedPhase = (
  phase: AgentInstallPresentation['phase'],
): phase is 'failed' | 'cancelled' =>
  phase === 'failed' || phase === 'cancelled';
export function AgentInstallControl(props: ControlProps): React.JSX.Element {
  const action = props.installation.action ?? agentAction(props.agent);
  if (failedPhase(props.installation.phase))
    return <FailedInstallControl {...props} action={action} />;
  return (
    <InstallSheetControl
      {...props}
      action={action}
      phase={props.installation.phase}
    />
  );
}
const agentAction = (agent: AgentDetail): 'Install' | 'Update' =>
  agent.status === 'update' ? 'Update' : 'Install';
function FailedInstallControl({
  installation,
  action,
}: Pick<ControlProps, 'installation'> & {
  action: 'Install' | 'Update';
}): React.JSX.Element {
  return (
    <>
      <FailedInstallButton installation={installation} action={action} />
      <AgentInstallAlert {...installation} />
    </>
  );
}
function FailedInstallButton({
  installation,
  action,
}: Pick<ControlProps, 'installation'> & {
  action: 'Install' | 'Update';
}): React.JSX.Element {
  return (
    <Button
      size="sm"
      label={action}
      fullWidth="narrow"
      onPress={() => installation.onOpenChange(true)}
    />
  );
}
type SheetControlProps = ControlProps & {
  action: 'Install' | 'Update';
  phase: 'confirm' | 'installing' | 'installed';
};
const distributionName = (agent: AgentDetail): string =>
  agent.distribution?.split(' · ')[0] ?? '';
const installMetadata = (
  agent: AgentDetail,
): { name: string; version: string; distribution: string } => ({
  name: agent.name,
  version: agent.availableVersion ?? agent.version ?? '',
  distribution: distributionName(agent),
});
function InstallSheetControl({
  agent,
  installation,
  phase,
  action,
}: SheetControlProps): React.JSX.Element {
  return (
    <AgentInstallSheet
      {...installMetadata(agent)}
      {...installation}
      action={action}
      phase={phase}
    />
  );
}
