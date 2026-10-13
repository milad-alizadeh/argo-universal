import type {
  AgentInstallInput,
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
} from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
export type StartInstall = UseMutationResult<
  AgentInstallOperation,
  ClientError,
  AgentInstallInput
>;
export function useStartInstall(
  status: UseQueryResult<AgentInstallStatus, ClientError>,
): { install: StartInstall; failedAt: number } {
  const trpc = useTRPC();
  const [failedAt, setFailedAt] = useState(0);
  const install = useMutation({
    ...trpc.agents.install.mutationOptions(),
    onSuccess: async () => {
      await status.refetch();
    },
    onError: () => setFailedAt(Date.now()),
  });
  return { install, failedAt };
}
export type StartInput = AgentInstallInput & {
  install: StartInstall;
  // The operation the Server reported before this request, so a new one can be told apart.
  current?: string;
  rememberPrevious: (operationId: string | undefined) => void;
  running: boolean;
};
const sendInstall = (input: StartInput, settled: () => void): void => {
  input.rememberPrevious(input.current);
  input.install.mutate(
    { agentId: input.agentId, version: input.version },
    { onSettled: settled },
  );
};
// One request at a time: the ref holds off a second press before the pending state renders.
export function useStart(input: StartInput): () => void {
  const requesting = useRef(false);
  return () => {
    if (input.running || requesting.current) return;
    requesting.current = true;
    sendInstall(input, () => (requesting.current = false));
  };
}
