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
  dismissedOperationId?: string;
  acceptOffer: () => void;
  setOpen: (open: boolean) => void;
};
type InstallationOffer = Pick<InstallationSheetState, 'action' | 'version'> & {
  operationId?: string;
};
type SheetSnapshot = {
  open: boolean;
  frozen: boolean;
  offer: InstallationOffer;
  dismissedOperationId?: string;
};
const closedSheet = (offer: InstallationOffer): SheetSnapshot => ({
  open: false,
  frozen: false,
  offer,
});
const changeSheet = (
  previous: SheetSnapshot,
  offer: InstallationOffer,
  open: boolean,
): SheetSnapshot => {
  if (open)
    return {
      ...previous,
      open,
      offer: previous.frozen ? previous.offer : offer,
    };
  return { ...closedSheet(offer), dismissedOperationId: offer.operationId };
};
export function useSheetState(
  offer: InstallationOffer,
): InstallationSheetState {
  const [sheet, setSheet] = useState<SheetSnapshot>(closedSheet(offer));
  return {
    ...(sheet.frozen ? sheet.offer : offer),
    open: sheet.open,
    dismissedOperationId: sheet.dismissedOperationId,
    setOpen: (open) =>
      setSheet((previous) => changeSheet(previous, offer, open)),
    acceptOffer: () =>
      setSheet((previous) => ({ ...previous, offer, frozen: true })),
  };
}

export const activeVersion = (
  operation: AgentInstallOperation | undefined,
  offered: string,
): string => (operation?.status === 'installing' ? operation.version : offered);
