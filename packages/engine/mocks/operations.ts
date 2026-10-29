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
