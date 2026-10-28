import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppRouter } from '@repo/engine/router';
import {
  readServerAddress,
  resolveRuntimeDirectory,
} from '@repo/engine/server-runtime';
import { createTRPCClient, httpLink } from '@trpc/client';

const requestTimeoutMs = 30_000;

export async function connectControl(
  timeoutMs = requestTimeoutMs,
): Promise<ReturnType<typeof createTRPCClient<AppRouter>>> {
  const home = resolveRuntimeDirectory();
  const address = readServerAddress(home);

  if (!address) throw new Error('No Server found. Start it with argo server.');

  const token =
    process.env.ARGO_TOKEN ??
    (await readFile(join(home, 'control.token'), 'utf8')).trim();

  return createClient(address.port, token, timeoutMs);
}

function createClient(
  port: number,
  token: string,
  timeoutMs: number,
): ReturnType<typeof createTRPCClient<AppRouter>> {
  const link = httpLink<AppRouter>({
    url: `http://127.0.0.1:${port}/trpc`,
    headers: { authorization: `Bearer ${token}` },
    fetch: (url, options) => {
      const timeout = AbortSignal.timeout(timeoutMs);
      const signal = options?.signal
        ? AbortSignal.any([options.signal, timeout])
        : timeout;
      return fetch(url, { ...options, signal });
    },
  });

  return createTRPCClient<AppRouter>({ links: [link] });
}
