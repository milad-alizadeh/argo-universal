import { expect, it } from 'vitest';
import {
  awaitPrompt,
  methodId,
  readTerminal,
  startTerminalAuth,
  subject,
  terminalStartup,
  isolateTerminalHome,
} from '#mocks/auth-terminal';

const ignoresHangup = ['--interactive-login', '--ignore-hangup'];

isolateTerminalHome();

const isRunning = (pid: number): boolean => {
  try {
    return process.kill(pid, 0);
  } catch {
    return false;
  }
};

it(
  'cancelling releases a sign-in program that ignores hangup and fails every waiting caller',
  terminalStartup,
  async () => {
    const host = await startTerminalAuth({ args: ignoresHangup });
    const result = host.caller.agents.authenticate({ ...subject, methodId });
    const pid = await awaitPrompt(host);
    await host.caller.agents.cancelAuthenticate(subject);
    expect(await result).toEqual({
      status: 'failed',
      message: 'Sign-in cancelled',
    });
    expect(isRunning(pid)).toBe(false);
    expect(await readTerminal(host)).toMatchObject({ closed: true });
    expect((await host.caller.agents.authState(subject)).pending).toBeNull();
  },
);

it(
  'stopping the Engine releases a sign-in program that ignores hangup',
  terminalStartup,
  async () => {
    const host = await startTerminalAuth({ args: ignoresHangup });
    const result = host.caller.agents.authenticate({ ...subject, methodId });
    const pid = await awaitPrompt(host);
    await host.stop();
    expect(await result).toMatchObject({ status: 'failed' });
    expect(isRunning(pid)).toBe(false);
  },
);
