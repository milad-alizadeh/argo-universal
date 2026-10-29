import type { ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readServerAddress } from '@repo/engine/server-runtime';

const serverStartMilliseconds = 30_000;

const serverPollMilliseconds = 200;

// Poll until the Server starts or its startup deadline expires.
export async function pollServer<T>(
  check: () => Promise<T | undefined>,
  timeoutMessage: (seconds: number) => string,
): Promise<NonNullable<Awaited<T>> | (Awaited<T> & null)> {
  const deadline = Date.now() + serverStartMilliseconds;

  while (Date.now() < deadline) {
    const result = await check();

    if (result !== undefined) return result;
    await delay(serverPollMilliseconds);
  }

  throw new Error(timeoutMessage(serverStartMilliseconds / 1000));
}

export const stderrTailLength = 2000;

type Readiness = {
  home: string;
  port: number;
  server: ChildProcess;
  portTaken: () => boolean;
  stderrTail: () => string;
};

async function readiness({
  home,
  port,
  server,
  portTaken,
  stderrTail,
}: Readiness): Promise<boolean | undefined> {
  assertRunning(server, stderrTail());

  if (portTaken()) return false;

  if (serverHasPort(home, port)) return true;

  return undefined;
}

function assertRunning(server: ChildProcess, tail: string): void {
  if (hasExited(server))
    throw new Error(`${describeExit(server)}${withStderr(tail)}`);
}

function serverHasPort(home: string, port: number): boolean {
  return readServerAddress(home)?.port === port;
}

// Only the Server in this isolated home can satisfy readiness.
export async function waitUntilReady(input: Readiness): Promise<boolean> {
  return pollServer(
    (): Promise<boolean | undefined> => readiness(input),
    (seconds): string =>
      `The Server did not start within ${seconds} s${withStderr(input.stderrTail())}`,
  );
}

export const hasExited = (server: ChildProcess): boolean =>
  server.exitCode !== null || server.signalCode !== null;

const describeExit = (server: ChildProcess): string =>
  server.signalCode === null
    ? `The Server exited with code ${server.exitCode}`
    : `The Server exited with signal ${server.signalCode}`;

const withStderr = (tail: string): string =>
  tail === ''
    ? ''
    : `\nServer stderr (last ${stderrTailLength} characters):\n${tail}`;
