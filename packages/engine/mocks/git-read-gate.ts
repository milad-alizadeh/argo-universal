import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer, type AddressInfo, type Socket } from 'node:net';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';
import { onTestFinished, vi } from 'vitest';

const execute = promisify(execFile);

type Gate = { started: () => Promise<void>; release: () => Promise<void> };

export async function holdProjectReads(home: string): Promise<Gate> {
  return holdGitReads(home, 'get-url');
}

export async function holdBranchReads(home: string): Promise<Gate> {
  return holdGitReads(home, 'for-each-ref');
}

/*
 * Each held read tells the gate it has started by connecting to it, and waits on that connection to be released.
 * `started` waits for that connection rather than polling for a deadline: on a loaded machine, starting git and the node script that holds it takes as long as it takes, and the test's own timeout bounds it.
 */
async function holdGitReads(home: string, argument: string): Promise<Gate> {
  const listener = await openListener();
  const directory = await prepareGate(home, { argument, port: listener.port });

  onTestFinished(async () => {
    await listener.release();
    listener.close();
    vi.unstubAllEnvs();
  });
  vi.stubEnv('PATH', `${directory}${delimiter}${process.env.PATH ?? ''}`);

  return { release: listener.release, started: () => listener.entered };
}

type Listener = {
  port: number;
  entered: Promise<void>;
  release: () => Promise<void>;
  close: () => void;
};

async function openListener(): Promise<Listener> {
  const held = new Set<Socket>();
  const entered = Promise.withResolvers<void>();
  let released = false;
  const server = createServer((socket): void => {
    entered.resolve();
    if (released) socket.end('released');
    else held.add(socket);
  });

  await new Promise<void>((resolve): void => {
    server.listen(0, '127.0.0.1', resolve);
  });
  server.unref();

  const release = async (): Promise<void> => {
    released = true;
    for (const socket of held) socket.end('released');
    held.clear();
  };

  return {
    port: (server.address() as AddressInfo).port,
    entered: entered.promise,
    release,
    close: (): void => void server.close(),
  };
}

type GateInput = { argument: string; port: number };

const prepareGate = async (home: string, input: GateInput): Promise<string> => {
  const { stdout } = await execute('which', ['git']);
  const directory = join(home, 'git-read-gate');
  await mkdir(directory);
  await writeFile(
    join(directory, 'git'),
    gitGateSource({ ...input, executable: stdout.trim() }),
    { mode: 0o755 },
  );

  return directory;
};

type GateSource = GateInput & { executable: string };

const gitGateSource = (input: GateSource): string =>
  gatePrefix + JSON.stringify(input) + gateSuffix;

const gatePrefix = `#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { connect } = require('node:net');
const input = `;

// A held read with no gate left to wait on runs; one whose gate closes without releasing it fails.
const gateSuffix = `;
const run = () => {
  const child = spawn(input.executable, process.argv.slice(2), { stdio: 'inherit' });
  child.once('error', () => process.exit(1));
  child.once('exit', (code) => process.exit(code ?? 1));
};
if (!process.argv.includes(input.argument)) run();
else {
  let state = 'connecting';
  const gate = connect(input.port, '127.0.0.1');
  gate.once('connect', () => { state = 'held'; });
  gate.once('data', () => { state = 'released'; gate.destroy(); run(); });
  gate.once('error', () => { if (state === 'connecting') { state = 'released'; run(); } });
  gate.once('close', () => { if (state === 'held') process.exit(1); });
}
`;
