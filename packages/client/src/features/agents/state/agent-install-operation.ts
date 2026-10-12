import type {
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
const statusOperation = (
  status: AgentInstallStatus | undefined,
): AgentInstallOperation | undefined => status?.operation ?? undefined;
const sameOperation = (
  first: AgentInstallOperation,
  second: AgentInstallOperation | undefined,
): boolean => second !== undefined && first.operationId === second.operationId;
const latestAfterRequest = (
  saved: AgentInstallOperation,
  latest: AgentInstallOperation | undefined,
  previousOperationId: string | undefined,
): AgentInstallOperation =>
  latest && latest.operationId !== previousOperationId ? latest : saved;
const interruptedOperation = (
  saved: AgentInstallOperation,
  status: AgentInstallStatus,
): AgentInstallOperation =>
  status.installation.status === 'installed'
    ? { ...saved, status: 'installed', version: status.installation.version }
    : {
        ...saved,
        status: 'failed',
        failure: 'Installation interrupted. No new installation was activated.',
      };
const reconcileMissingOperation = (
  saved: AgentInstallOperation,
  status: AgentInstallStatus | undefined,
): AgentInstallOperation =>
  status && saved.status === 'installing'
    ? interruptedOperation(saved, status)
    : saved;
const selectKnownLatest = (
  saved: AgentInstallOperation,
  latest: AgentInstallOperation,
  previousOperationId: string | undefined,
): AgentInstallOperation =>
  sameOperation(saved, latest)
    ? latest
    : latestAfterRequest(saved, latest, previousOperationId);
export const currentOperation = (
  saved: AgentInstallOperation | undefined,
  status?: AgentInstallStatus,
  previousOperationId?: string,
): AgentInstallOperation | undefined => {
  const latest = statusOperation(status);
  if (!saved) return latest;
  if (!latest) return reconcileMissingOperation(saved, status);
  return selectKnownLatest(saved, latest, previousOperationId);
};
export const operationFailure = (
  operation: AgentInstallOperation | undefined,
): string | undefined =>
  operation?.status === 'failed' ? operation.failure : undefined;
