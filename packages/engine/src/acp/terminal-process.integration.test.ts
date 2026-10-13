import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished } from 'vitest';
import { resourceLaunch } from '#mocks/acp-resource';
import { launchLoginTerminal } from './terminal-process';
const terminalStartupTimeout = 15_000;
const executable = process.execPath;
const script = fileURLToPath(
  new URL('../../mocks/login-terminal.mjs', import.meta.url),
);
const launch = {
  ...resourceLaunch,
  executable,
  args: [script],
  cwd: process.cwd(),
  env: { LOGIN_MODE: 'owned' },
};
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
