import { mkdtempSync, rmSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it, onTestFinished } from 'vitest';
import { resourceLaunch } from '#mocks/acp-resource';
import { processIsRunning } from '#mocks/shell-process';
import type { ShellCommand } from './shell-command';
import { launchShellCommand } from './shell-launch';

const home = mkdtempSync(join(tmpdir(), 'argo-shell-command-'));

afterAll(() => rmSync(home, { recursive: true, force: true }));

const run = async (
  script: string,
  env: { name: string; value: string }[] = [],
): Promise<{ command: ShellCommand; output: () => string }> => {
  let output = '';

  const command = await launchShellCommand({
    home,
    cwd: home,
    launch: { ...resourceLaunch, cwd: home },
    request: {
      sessionId: 'acp-session',
      command: process.execPath,
      args: ['-e', script],
      env,
    },
    output: (chunk): void => {
      output += chunk.toString();
    },
  });

  onTestFinished(async () => {
    command.kill();
    await command.exited;
  });

  return { command, output: (): string => output };
};

it('reports the exit code of a command that finishes, with everything it printed', async (): Promise<void> => {
  const { command, output } = await run(
    "console.log('out'); console.error('err'); process.exitCode = 3",
  );

  await expect(command.exited).resolves.toMatchObject({ exitCode: 3 });
  expect(output()).toContain('out');
  expect(output()).toContain('err');
  expect(command.isRunning()).toBe(false);
});

it('hands the command the environment its request names', async (): Promise<void> => {
  const { command, output } = await run(
    'console.log(process.env.SHELL_FIXTURE)',
    [{ name: 'SHELL_FIXTURE', value: 'from-request' }],
  );

  await command.exited;
  expect(output()).toContain('from-request');
});

it('records the command group while it runs and kills the whole group on kill', async (): Promise<void> => {
  const { command, output } = await run(
    "const child = require('node:child_process').spawn('sleep', ['60'], { stdio: 'ignore' }); console.log('child:' + child.pid); setInterval(() => {}, 1000)",
  );

  await expect.poll(output).toMatch(/child:\d+/);
  const pid = Number(/child:(\d+)/.exec(output())?.[1]);
  const folder = join(home, 'shell-processes');
  expect(await readdir(folder)).toHaveLength(1);
  expect(command.isRunning()).toBe(true);

  expect(command.kill()).toBe(true);
  await command.exited;

  expect(processIsRunning(pid)).toBe(false);
  expect(await readdir(folder)).toEqual([]);
  expect(command.isRunning()).toBe(false);
  expect(command.kill()).toBe(false);
});

it('refuses a command whose executable does not exist', async (): Promise<void> => {
  await expect(
    launchShellCommand({
      home,
      cwd: home,
      launch: { ...resourceLaunch, cwd: home },
      request: { sessionId: 'acp-session', command: join(home, 'missing') },
      output: () => {},
    }),
  ).rejects.toThrow('ENOENT');
  expect(await readdir(join(home, 'shell-processes'))).toEqual([]);
});
