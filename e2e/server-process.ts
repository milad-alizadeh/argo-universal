import type { ChildProcess } from 'node:child_process';
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
    await new Promise((resolve): NodeJS.Timeout =>
      setTimeout(resolve, serverPollMilliseconds),
    );
  }
  throw new Error(timeoutMessage(serverStartMilliseconds / 1000));
}

export const stderrTailLength = 2000;

// Only the Server in this isolated home can satisfy readiness.
export async function waitUntilReady({
  home,
  port,
  server,
  portTaken,
  stderrTail,
}: {
  home: string;
  port: number;
  server: ChildProcess;
  portTaken: () => boolean;
  stderrTail: () => string;
}): Promise<boolean> {
  return pollServer(
    async (): Promise<boolean | undefined> => {
      if (hasExited(server))
        throw new Error(`${describeExit(server)}${withStderr(stderrTail())}`);
      if (portTaken()) return false;
      if (readServerAddress(home)?.port === port) return true;
      return;
    },
    (seconds): string =>
      `The Server did not start within ${seconds} s${withStderr(stderrTail())}`,
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
