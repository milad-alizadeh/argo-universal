import type {
  AgentInstallInput,
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import {
  installationFailure,
  installationPhase,
  type InstallPhaseInput,
} from '../state/agent-install-phase';
import type { AgentInstallPresentation } from '../state/agent-install-types';
import {
  useInstallationOperation,
  useSheetState,
  activeVersion,
  type ObservedOperation,
} from './use-installation-operation';
import { useCompletedRefresh } from './use-installation-refresh';
const installPollMs = 500;
type StartInstall = UseMutationResult<
  AgentInstallOperation,
  ClientError,
  AgentInstallInput
>;
type CancelInput = { agentId: string; operationId: string };
type CancelInstall = UseMutationResult<void, ClientError, CancelInput>;
type Commands = { install: StartInstall; cancel: CancelInstall };
type PresentationInput = Commands & {
  action: 'Install' | 'Update';
  open: boolean;
  setOpen: (value: boolean) => void;
  operation?: AgentInstallOperation;
  status?: AgentInstallStatus;
  agentId: string;
  version: string;
  previousOperationId?: string;
  rememberPrevious: (operationId: string | undefined) => void;
};
const openIfInstalling = (
  operation: AgentInstallOperation,
  open: (value: boolean) => void,
): void => {
  if (operation.status === 'installing') open(true);
};
function useReconnectedInstallation(
  operation: AgentInstallOperation | undefined,
  open: (value: boolean) => void,
): void {
  const observed = useRef(false);
  useEffect(() => {
    if (!operation) return;
    if (observed.current) return;
    observed.current = true;
    openIfInstalling(operation, open);
  }, [operation, open]);
}
function useCommands(
  status: UseQueryResult<AgentInstallStatus, ClientError>,
): Commands {
  const trpc = useTRPC();
  return {
    install: useMutation({
      ...trpc.agents.install.mutationOptions(),
      onSuccess: async () => {
        await status.refetch();
      },
    }),
    cancel: useMutation(trpc.agents.cancelInstall.mutationOptions()),
  };
}
function useInstallStatus(
  agentId: string,
): UseQueryResult<AgentInstallStatus, ClientError> {
  return useQuery({
    ...useTRPC().agents.installStatus.queryOptions({ agentId }),
    refetchInterval: installPollMs,
  });
}
const phaseInput = (input: PresentationInput): InstallPhaseInput => ({
  operation: hasCompletedPreviousRelease(input) ? undefined : input.operation,
  previousOperationId: input.previousOperationId,
  pending: input.install.isPending,
  failure: input.install.error?.message,
});
const startInstall = (input: PresentationInput): void => {
  input.rememberPrevious(input.status?.operation?.operationId);
  input.setOpen(true);
  input.install.mutate({ agentId: input.agentId, version: input.version });
};
const cancelInstall = (input: PresentationInput): void => {
  const operation = input.operation;
  if (!operation || operation.status !== 'installing') return;
  input.cancel.mutate(
    { agentId: operation.agentId, operationId: operation.operationId },
    { onSuccess: () => input.setOpen(false) },
  );
};
const presentation = (input: PresentationInput): AgentInstallPresentation => ({
  action: input.action,
  version: input.version,
  open: input.open,
  onOpenChange: input.setOpen,
  phase: installationPhase(phaseInput(input)),
  failure: installationFailure(phaseInput(input)),
  cancelling: input.cancel.isPending,
  status: input.status,
  onInstall: () => startInstall(input),
  onCancel: () => cancelInstall(input),
});
type InstallationControls = Commands &
  ObservedOperation & { status?: AgentInstallStatus };
function useInstallationControls(agentId: string): InstallationControls {
  const status = useInstallStatus(agentId),
    commands = useCommands(status);
  const observed = useInstallationOperation(
    commands.install.data,
    status,
    commands.install.submittedAt,
  );
  useCompletedRefresh(observed.operation);
  return { ...commands, ...observed, status: status.data };
}
export function useAgentInstallation(
  agentId: string,
  version: string,
  action: 'Install' | 'Update' = 'Install',
): AgentInstallPresentation {
  const controls = useInstallationControls(agentId);
  const sheet = useSheetState({
    action,
    version: activeVersion(controls.operation, version),
  });
  useReconnectedInstallation(controls.operation, sheet.setOpen);
  return presentation({ ...controls, ...sheet, agentId });
}

const hasCompletedPreviousRelease = (input: PresentationInput): boolean =>
  input.operation?.status === 'installed' &&
  input.operation.version !== input.version;
