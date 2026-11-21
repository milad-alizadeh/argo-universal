import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished, vi } from 'vitest';
import { launchTerminal } from './node-pty-terminal';

const freePort = (): Promise<number> =>
  new Promise((resolve) => {
    const server = createServer();

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      server.close(() =>
        resolve(typeof address === 'object' && address ? address.port : 0),
      );
    });
  });

const listening = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => resolve(true));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(false)));
  });

// A login shell of bash whose profile sets a marker, in a home of its own, so the test never reads the developer's profile.
const hermeticLogin = (): string => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'argo-run-home-')));
  const cwd = join(home, 'work');
  mkdirSync(cwd);
  writeFileSync(
    join(home, '.bash_profile'),
    'export ARGO_LOGIN_MARKER=from-profile\n',
  );
  onTestFinished(() => rmSync(home, { recursive: true, force: true }));
  vi.stubEnv('SHELL', '/bin/bash');
  vi.stubEnv('HOME', home);
  onTestFinished(() => void vi.unstubAllEnvs());

  return cwd;
};

it('runs a command with $PORT and the environment its login shell sets up', async () => {
  const cwd = hermeticLogin();
  const port = await freePort();

  const terminal = await launchTerminal({
    id: 'login-run',
    command: 'echo "marker=$ARGO_LOGIN_MARKER port=$PORT"',
    cwd,
    env: { PORT: String(port) },
    port,
  });

  let output = '';
  terminal.onData((data) => {
    output += data;
  });
  await new Promise<void>((resolve) => terminal.onExit(() => resolve()));

  expect(output).toContain(`marker=from-profile port=${port}`);
});

it('reports the command’s own exit code, after its output', async () => {
  const cwd = hermeticLogin();

  const terminal = await launchTerminal({
    id: 'exit-run',
    command: 'echo before; exit 3',
    cwd,
    env: {},
    port: await freePort(),
  });

  let output = '';
  terminal.onData((data) => {
    output += data;
  });

  const exit = await new Promise<{ exitCode: number }>((resolve) =>
    terminal.onExit(resolve),
  );

  expect(exit.exitCode).toBe(3);
  expect(output).toContain('before');
});

it('leaves nothing listening after Stop, even a child that ignores SIGTERM', async () => {
  const cwd = hermeticLogin();
  const port = await freePort();

  // A child that ignores SIGTERM and holds the port, as a stubborn dev server does.
  const server = `require('net').createServer().listen(Number(process.env.PORT),'127.0.0.1');process.on('SIGTERM',()=>{});setInterval(()=>{},1000)`;
  const command = `${JSON.stringify(process.execPath)} -e ${JSON.stringify(server)} & wait`;

  const terminal = await launchTerminal({
    id: 'stubborn-run',
    command,
    cwd,
    env: { PORT: String(port) },
    port,
  });

  await expect.poll(() => listening(port), { timeout: 10_000 }).toBe(true);
  await terminal.stop();

  expect(await listening(port)).toBe(false);
}, 30_000);
