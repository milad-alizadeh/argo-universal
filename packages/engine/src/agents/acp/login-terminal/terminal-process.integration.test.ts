import {
  chmod,
  mkdtemp,
  readdir,
  readFile,
  stat,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { resourceLaunch } from '#mocks/acp-resource';
import { loginProject } from '#mocks/acp-shell';
import { launchLoginTerminal } from './terminal-process';

const terminalStartupTimeout = 15_000;

const ownerOnlyMode = 0o700;

const permissionBits = 0o777;

const executable = process.execPath;

const script = fileURLToPath(
  new URL('../../../../mocks/login-terminal.mjs', import.meta.url),
);

const launch = {
  ...resourceLaunch,
  executable,
  args: [script],
  cwd: process.cwd(),
  env: { LOGIN_MODE: 'owned' },
};

beforeEach(async () => {
  const home = await mkdtemp(join(tmpdir(), 'argo-terminal-'));
  vi.stubEnv('ARGO_HOME', home);
  onTestFinished(async () => {
    await rm(home, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });
});

it(
  'provides a real PTY with captured environment, raw input and resize',
  { timeout: terminalStartupTimeout },
  async () => {
    let output = '';

    const child = await launchLoginTerminal(launch, (text) => {
      output += text;
    });

    onTestFinished(() => child.close());
    await expect
      .poll(() => output, { timeout: terminalStartupTimeout })
      .toContain('tty:true:80:24:owned');
    child.resize(40, 12);
    await expect
      .poll(() => output, { timeout: terminalStartupTimeout })
      .toContain('size:40:12');
    child.write('\u001b[A\r');
    await expect
      .poll(() => output, { timeout: terminalStartupTimeout })
      .toContain('input:1b5b410d');
    expect(await child.exited).toMatchObject({ exitCode: 0 });
  },
);

it(
  'observes terminal descendants close even when they ignore SIGTERM',
  { timeout: terminalStartupTimeout },
  async () => {
    let output = '';

    const child = await launchLoginTerminal(
      { ...launch, args: [script, 'descendant'] },
      (text) => {
        output += text;
      },
    );

    onTestFinished(() => child.close());
    await expect
      .poll(() => output, { timeout: terminalStartupTimeout })
      .toContain('descendant:');
    const pid = Number(output.match(/descendant:(\d+)/)?.[1]);
    await child.close();
    expect(() => process.kill(pid, 0)).toThrow(/ESRCH/);
  },
);

it(
  'keeps terminal control private and removes its metadata after observed cleanup',
  async () => {
    const child = await launchLoginTerminal(launch, () => {});
    onTestFinished(() => child.close());
    const folder = join(process.env.ARGO_HOME ?? '', 'login-terminals');
    const [name] = await readdir(folder);

    if (!name) throw new Error('Terminal ownership record is missing');

    const record = z
      .strictObject({ pid: z.number(), token: z.string().uuid() })
      .parse(JSON.parse(await readFile(join(folder, name), 'utf8')));

    const controlFolder = join('/tmp', `argo-terminal-${record.token}`);
    expect((await stat(controlFolder)).mode & permissionBits).toBe(
      ownerOnlyMode,
    );
    expect(Object.keys(record)).toEqual(['pid', 'token']);
    await child.close();
    expect(await readdir(folder)).toEqual([]);
    await expect(stat(controlFolder)).rejects.toMatchObject({ code: 'ENOENT' });
  },
  terminalStartupTimeout,
);

it(
  'finds a bare sign-in executable on the Project login-shell PATH',
  { timeout: terminalStartupTimeout },
  async () => {
    const { directory, bin } = loginProject();
    const probe = join(bin, 'argo-login-probe');
    await writeFile(probe, '#!/bin/sh\necho "login-path:$ARGO_LOGIN_VALUE"\n');
    await chmod(probe, permissionBits);
    let output = '';

    const child = await launchLoginTerminal(
      { ...launch, executable: 'argo-login-probe', args: [], cwd: directory },
      (text) => {
        output += text;
      },
    );

    onTestFinished(() => child.close());
    await expect
      .poll(() => output, { timeout: terminalStartupTimeout })
      .toContain('login-path:login');
  },
);
