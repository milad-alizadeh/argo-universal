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

type InstallationSheetState = {
  open: boolean;
  action: 'Install' | 'Update';
  version: string;
  setOpen: (open: boolean) => void;
};
type InstallationOffer = Pick<InstallationSheetState, 'action' | 'version'>;
export function useSheetState(
  offer: InstallationOffer,
): InstallationSheetState {
  const [sheet, setSheet] = useState({ open: false, offer });
  const setOpen = (open: boolean): void =>
    setSheet((previous) => ({
      open,
      offer: previous.open ? previous.offer : offer,
    }));
  return { ...(sheet.open ? sheet.offer : offer), open: sheet.open, setOpen };
}

export const activeVersion = (
  operation: AgentInstallOperation | undefined,
  offered: string,
): string => (operation?.status === 'installing' ? operation.version : offered);
