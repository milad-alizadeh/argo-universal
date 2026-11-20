import { type ChildProcessByStdio, spawn } from 'node:child_process';
import { once } from 'node:events';
import { connect, createServer } from 'node:net';
import type { Readable, Writable } from 'node:stream';

export const POLL_MS = 10;

export const HOST = '127.0.0.1';

const lockModule = new URL('browser-suite-lock.ts', import.meta.url).href;

export type OtherSuite = ChildProcessByStdio<Writable, Readable, null>;

const others: OtherSuite[] = [];

const holderScript = (port: number, announceWait: boolean): string =>
  `const { acquireBrowserSuiteLock } = await import(${JSON.stringify(lockModule)});
   const release = await acquireBrowserSuiteLock({ port: ${port}, pollMs: ${POLL_MS},
     onWait: () => { if (${announceWait}) process.stdout.write('waiting'); } });
   process.stdout.write('held');
   process.stdin.on('end', release).resume();`;

// What the other suite appears to run, as `process.argv` shows it.
export const OTHER_COMMAND = 'vitest run turn-end.test';

const childArgs = (script: string): string[] => [
  '--input-type=module',
  '-e',
  script,
  ...OTHER_COMMAND.split(' '),
];

// Another suite: holds the lock, says so on stdout, and releases when its stdin closes.
export const holdInAnotherProcess = (
  port: number,
  announceWait = false,
): OtherSuite => {
  const script = holderScript(port, announceWait);

  const other = spawn(process.execPath, childArgs(script), {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  others.push(other);

  return other;
};

export async function freePort(): Promise<number> {
  const server = createServer().listen(0, HOST);
  await once(server, 'listening');
  const address = server.address();
  server.close();

  return typeof address === 'object' && address ? address.port : 0;
}

export async function isHeld(port: number): Promise<boolean> {
  const socket = connect({ port, host: HOST });

  const connected = await new Promise<boolean>((resolve): void => {
    socket.once('connect', (): void => {
      resolve(true);
    });
    socket.once('error', (): void => {
      resolve(false);
    });
  });

  socket.destroy();

  return connected;
}

// Stops every suite a test started; call it from `afterEach`.
export async function stopOtherSuites(): Promise<void> {
  const running = others
    .splice(0)
    .filter(
      (other): boolean => other.exitCode === null && other.signalCode === null,
    );

  for (const other of running) other.kill();
  await Promise.all(running.map((other) => once(other, 'exit')));
}
