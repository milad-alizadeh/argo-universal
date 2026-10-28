import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTRPCClient, httpLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';

interface OperationTestHost {
  home: string;
  url: string;
}

export async function operationCaller({
  home,
  url,
}: OperationTestHost): Promise<TRPCClient<AppRouter>> {
  const token = (await readFile(join(home, 'control.token'), 'utf8')).trim();

  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${url}/trpc`,
        headers: { authorization: `Bearer ${token}` },
      }),
    ],
  });
}
