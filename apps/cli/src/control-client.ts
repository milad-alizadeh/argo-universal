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
  timeoutMs?: number,
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
  timeoutMs: number | undefined,
): ReturnType<typeof createTRPCClient<AppRouter>> {
  const link = controlLink(port, token, timeoutMs);

  return createTRPCClient<AppRouter>({ links: [link] });
}

function controlLink(
  port: number,
  token: string,
  timeoutMs: number | undefined,
): ReturnType<typeof httpLink<AppRouter>> {
  return httpLink<AppRouter>({
    url: `http://127.0.0.1:${port}/trpc`,
    headers: { authorization: `Bearer ${token}` },
    fetch: timedFetch(timeoutMs),
  });
}

function timedFetch(timeoutMs: number | undefined): typeof globalThis.fetch {
  return (url, options) =>
    fetch(url, {
      ...options,
      signal: requestSignal(options?.signal, timeoutMs),
    });
}

function requestSignal(
  signal: RequestInit['signal'],
  timeoutMs: number | undefined,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs ?? requestTimeoutMs);

  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
