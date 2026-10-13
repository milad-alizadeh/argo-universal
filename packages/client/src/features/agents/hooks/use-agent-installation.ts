import type { AgentInstallStatus } from '@repo/contracts';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { type ClientError, useTRPC } from '#features/connection';
import {
  installationNotice,
  installationRunning,
  type InstallPhaseInput,
} from '../state/agent-install-phase';
import type {
  AgentInstallPresentation,
  InstallAction,
} from '../state/agent-install-types';
import {
  useInstallationOperation,
  useConfirmationState,
  useRunningAction,
  useWatchedOperations,
  activeVersion,
  type ObservedOperation,
} from './use-installation-operation';
import { useCompletedRefresh } from './use-installation-refresh';
import {
  type StartInput,
  type StartInstall,
  useStart,
  useStartInstall,
} from './use-start-install';
const installPollMs = 500;
type InstallationControls = ObservedOperation & {
  install: StartInstall;
  // When the start request last failed, to tell a confirmed failure from a lost response.
  failedAt: number;
  statusAt: number;
  status?: AgentInstallStatus;
  watched: readonly string[];
};
function useInstallStatus(
  agentId: string,
): UseQueryResult<AgentInstallStatus, ClientError> {
  return useQuery({
    ...useTRPC().agents.installStatus.queryOptions({ agentId }),
    refetchInterval: installPollMs,
  });
}
// Where the Agent installs, for the confirmation to name.
function useServerName(): string | undefined {
  return useQuery(useTRPC().system.info.queryOptions()).data?.name;
}
const requestFailure = (
  controls: InstallationControls,
): Pick<
  InstallPhaseInput,
  'pending' | 'failure' | 'requestId' | 'failureConfirmed'
> => ({
  pending: controls.install.isPending,
  failure: controls.install.error?.message,
  requestId: controls.install.submittedAt,
  failureConfirmed: controls.statusAt > controls.failedAt,
});
const phaseInput = (controls: InstallationControls): InstallPhaseInput => ({
  operation: controls.operation,
  previousOperationId: controls.previousOperationId,
  watched: controls.watched,
  ...requestFailure(controls),
});
function useObservedInstallation(
  install: StartInstall,
  status: UseQueryResult<AgentInstallStatus, ClientError>,
): ObservedOperation & { watched: readonly string[] } {
  const { data, submittedAt } = install;
  const observed = useInstallationOperation(data, status, submittedAt);
  const watched = useWatchedOperations(observed.operation, data?.operationId);
  useCompletedRefresh(observed.operation);
  return { ...observed, watched };
}
function useInstallationControls(agentId: string): InstallationControls {
  const status = useInstallStatus(agentId);
  const { install, failedAt } = useStartInstall(status);
  const observed = useObservedInstallation(install, status);
  const statusAt = status.dataUpdatedAt;
  return { install, failedAt, statusAt, ...observed, status: status.data };
}
const startInput = (
  controls: InstallationControls,
  agentId: string,
  version: string,
): StartInput => ({
  agentId,
  version,
  install: controls.install,
  current: controls.status?.operation?.operationId,
  rememberPrevious: controls.rememberPrevious,
  running: installationRunning(phaseInput(controls)),
});
function useProgress(
  controls: InstallationControls,
  action: InstallAction,
): Pick<AgentInstallPresentation, 'installing' | 'notice' | 'status'> {
  const phase = phaseInput(controls);
  const installing = installationRunning(phase);
  const ranAs = useRunningAction(action, installing);
  const notice = installationNotice(phase);
  const status = controls.status;
  return { installing, notice: notice && { ...notice, action: ranAs }, status };
}
function useAgentInstallationControls(
  agentId: string,
  version: string,
  action: InstallAction,
): AgentInstallPresentation {
  const controls = useInstallationControls(agentId);
  const { setConfirming, ...offer } = useConfirmationState({
    action,
    version: activeVersion(controls.operation, version),
  });
  const onInstall = useStart(startInput(controls, agentId, offer.version));
  const shown = { ...offer, ...useProgress(controls, offer.action) };
  return { ...shown, onConfirmingChange: setConfirming, onInstall };
}
export function useAgentInstallation(
  agentId: string,
  version: string,
  action: InstallAction = 'Install',
): AgentInstallPresentation {
  const installation = useAgentInstallationControls(agentId, version, action);
  return { ...installation, server: useServerName() };
}
