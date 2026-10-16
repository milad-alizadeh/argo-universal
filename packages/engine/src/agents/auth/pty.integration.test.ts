import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { expect, it, onTestFinished } from 'vitest';
import { resourceLaunch } from '#mocks/acp-resource';
import { launchAuthTerminal } from './pty';

it.skipIf(process.platform === 'win32')(
  'closing a real sign-in PTY escalates when the Agent ignores SIGHUP',
  { timeout: 20_000 },
  async () => {
    let output = '';
    const command = scriptedAgentCommand('reply');

    const child = await launchAuthTerminal(
      {
        ...resourceLaunch,
        ...command,
        args: [...command.args, '--interactive-login', '--auth-ignore-hangup'],
        cwd: process.cwd(),
      },
      (text) => {
        output += text;
      },
    );

    onTestFinished(() => child.close());
    await expect
      .poll(() => output, { timeout: 15_000 })
      .toContain('Continue in your browser');
    await Promise.all([child.close(), child.close()]);
    expect(await child.exited).toMatchObject({ signal: 9 });
    await child.close();
  },
);
