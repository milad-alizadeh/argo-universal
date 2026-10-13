import type {
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import type { ClientError } from '#features/connection';
import { currentOperation } from '../state/agent-install-operation';
import type { InstallAction } from '../state/agent-install-types';
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

const runningOperationId = (
  operation: AgentInstallOperation | undefined,
): string | undefined =>
  operation?.status === 'installing' ? operation.operationId : undefined;
// The operations this page started or saw running; one that settled before the page opened is old news.
export function useWatchedOperations(
  operation: AgentInstallOperation | undefined,
  requested: string | undefined,
): readonly string[] {
  const [seen, setSeen] = useState<string>();
  const running = runningOperationId(operation) ?? seen;
  if (running !== seen) setSeen(running);
  return [requested, running].filter((id) => id !== undefined);
}

type Run = { action: InstallAction; running: boolean };
const nextRun = (run: Run, action: InstallAction, running: boolean): Run =>
  running === run.running
    ? run
    : { running, action: running ? action : run.action };
// The action a run started as, kept until the next run: the page's offer can change mid-run or once it settles.
export function useRunningAction(
  action: InstallAction,
  running: boolean,
): InstallAction {
  const [run, setRun] = useState<Run>({ action, running });
  const next = nextRun(run, action, running);
  if (next !== run) setRun(next);
  return next.action;
}

type ConfirmationState = {
  confirming: boolean;
  action: InstallAction;
  version: string;
  setConfirming: (open: boolean) => void;
};
type InstallationOffer = Pick<ConfirmationState, 'action' | 'version'>;
// An open confirmation keeps the offer it opened with, so a catalog refresh cannot change what OK installs.
export function useConfirmationState(
  offer: InstallationOffer,
): ConfirmationState {
  const [state, setState] = useState({ confirming: false, offer });
  const setConfirming = (confirming: boolean): void =>
    setState((previous) => ({
      confirming,
      offer: previous.confirming ? previous.offer : offer,
    }));
  const shown = state.confirming ? state.offer : offer;
  return { ...shown, confirming: state.confirming, setConfirming };
}

export const activeVersion = (
  operation: AgentInstallOperation | undefined,
  offered: string,
): string => (operation?.status === 'installing' ? operation.version : offered);

const updatingInstallation = (status: AgentInstallStatus): boolean =>
  status.installation.status === 'installed' &&
  status.operation?.status === 'installing';
export const activeAction = (
  status: AgentInstallStatus | undefined,
  offered: InstallAction,
): InstallAction =>
  status && updatingInstallation(status) ? 'Update' : offered;
