import type { OperationExecution } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { createTRPCClient, httpLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import { readControlToken, writeServerAddress } from '../src/server-runtime';

interface OperationTestHost {
  home: string;
  url: string;
}

export async function operationCaller(
  { home, url }: OperationTestHost,
  suppliedToken?: string,
): Promise<TRPCClient<AppRouter>> {
  const token = suppliedToken ?? (await readControlToken(home));

  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${url}/trpc`,
        headers: { authorization: `Bearer ${token}` },
      }),
    ],
  });
}

export function publishControlAddress({ home, url }: OperationTestHost): void {
  writeServerAddress(home, {
    pid: process.pid,
    port: Number(new URL(url).port),
    version: '1.2.3',
    startedAt: '2026-10-03T00:00:00.000Z',
  });
}

type RunValue = Json | OperationExecution;

type OperationProcedures = TRPCClient<AppRouter>['operations'];

// Runs an Operation as `operations.run` does and answers what a test asserts on: the Operation's own result, or the execution of the native work it started. A refusal stays a refusal.
export async function runOperation(
  procedures: Pick<OperationProcedures, 'run'>,
  input: Parameters<OperationProcedures['run']['mutate']>[0],
  options?: Parameters<OperationProcedures['run']['mutate']>[1],
): Promise<RunValue> {
  const response = await procedures.run.mutate(input, options);

  return response.kind === 'result' ? response.result : response;
}
