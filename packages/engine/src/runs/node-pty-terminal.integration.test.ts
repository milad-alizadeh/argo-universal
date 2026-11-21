import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
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

it('runs a command with $PORT and the login shell environment, and leaves nothing listening after Stop', async () => {
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), 'argo-run-')));
  onTestFinished(() => rmSync(cwd, { recursive: true, force: true }));
  const port = await freePort();

  // A child that ignores SIGTERM and holds the port, as a stubborn dev server does.
  const server = `require('net').createServer().listen(Number(process.env.PORT),'127.0.0.1');process.on('SIGTERM',()=>{});setInterval(()=>{},1000)`;
  const command = `echo "port=$PORT path=\${PATH:+set}"; ${JSON.stringify(process.execPath)} -e ${JSON.stringify(server)} & wait`;

  const terminal = await launchTerminal({
    id: 'real-run',
    command,
    cwd,
    env: { PORT: String(port) },
    port,
  });

  let output = '';
  terminal.onData((data) => {
    output += data;
  });
  await expect.poll(() => listening(port), { timeout: 10_000 }).toBe(true);

  expect(output).toContain(`port=${port} path=set`);

  await terminal.stop();

  expect(await listening(port)).toBe(false);
}, 30_000);
