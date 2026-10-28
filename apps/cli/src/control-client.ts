import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppRouter } from '@repo/engine/router';
import {
  readServerAddress,
  resolveRuntimeDirectory,
} from '@repo/engine/server-runtime';
import { createTRPCClient, httpLink } from '@trpc/client';

const requestTimeoutMs = 30_000;

export async function connectControl(): Promise<
  ReturnType<typeof createTRPCClient<AppRouter>>
> {
  const home = resolveRuntimeDirectory();
  const address = readServerAddress(home);

  if (!address) throw new Error('No Server found. Start it with argo server.');

  const token =
    process.env.ARGO_TOKEN ??
    (await readFile(join(home, 'control.token'), 'utf8')).trim();

  return createClient(address.port, token);
}

function createClient(
  port: number,
  token: string,
): ReturnType<typeof createTRPCClient<AppRouter>> {
  const link = httpLink<AppRouter>({
    url: `http://127.0.0.1:${port}/trpc`,
    headers: { authorization: `Bearer ${token}` },
    fetch: (url, options) =>
      fetch(url, { ...options, signal: AbortSignal.timeout(requestTimeoutMs) }),
  });

  return createTRPCClient<AppRouter>({ links: [link] });
}
