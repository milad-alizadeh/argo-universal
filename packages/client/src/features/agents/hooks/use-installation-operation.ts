import type {
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import type { ClientError } from '#features/connection';
import { currentOperation } from '../state/agent-install-operation';
export type ObservedOperation = {
  operation: AgentInstallOperation | undefined;
  previousOperationId?: string;
  rememberPrevious: (operationId: string | undefined) => void;
};
export function useInstallationOperation(
  saved: AgentInstallOperation | undefined,
  status: UseQueryResult<AgentInstallStatus, ClientError>,
  submittedAt: number,
): ObservedOperation {
  const [previous, rememberPrevious] = useState<string | undefined>();
  const confirmed =
    status.dataUpdatedAt >= submittedAt ? status.data : undefined;
  return {
    operation: currentOperation(saved, confirmed, previous),
    previousOperationId: previous,
    rememberPrevious,
  };
}
