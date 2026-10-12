import type * as React from 'react';
import { View } from 'react-native';
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
  if (failedPhase(props.installation.phase))
    return <FailedInstallControl {...props} />;
  return <InstallSheetControl {...props} phase={props.installation.phase} />;
}
function FailedInstallControl({
  installation,
}: ControlProps): React.JSX.Element {
  return (
    <>
      <Button
        size="sm"
        label="Install"
        fullWidth="narrow"
        onPress={() => installation.onOpenChange(true)}
      />
      <AgentInstallAlert {...installation} />
    </>
  );
}
type SheetControlProps = ControlProps & {
  phase: 'confirm' | 'installing' | 'installed';
};
const distributionName = (agent: AgentDetail): string =>
  agent.distribution?.split(' · ')[0] ?? '';
const installMetadata = (
  agent: AgentDetail,
): { name: string; version: string; distribution: string } => ({
  name: agent.name,
  version: agent.version ?? '',
  distribution: distributionName(agent),
});
function InstallSheetControl({
  agent,
  installation,
  phase,
}: SheetControlProps): React.JSX.Element {
  return (
    <View>
      <AgentInstallSheet
        {...installMetadata(agent)}
        {...installation}
        phase={phase}
      />
    </View>
  );
}
