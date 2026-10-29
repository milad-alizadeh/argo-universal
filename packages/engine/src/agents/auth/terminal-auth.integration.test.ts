import { fixtureRegistryIds } from '@repo/mocks/agent/app-fixtures';
import { terminalLogin } from '@repo/mocks/agent/terminal-login';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  awaitPrompt,
  methodId,
  readTerminal,
  startTerminalAuth,
  subject,
  terminalStartup,
} from '#mocks/auth-terminal';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

it(
  'shares a real sign-in PTY across callers, accepts input and succeeds on exit 0',
  terminalStartup,
  async () => {
    const host = await startTerminalAuth({ args: ['--interactive-login'] });
    const first = host.caller.agents.authenticate({ ...subject, methodId });
    await awaitPrompt(host);

    const second = host
      .createCaller()
      .agents.authenticate({ ...subject, methodId });

    await host.caller.agents.authTerminalInput({
      ...subject,
      input: { type: 'resize', cols: 100, rows: 30 },
    });
    await host.caller.agents.authTerminalInput({
      ...subject,
      input: { type: 'write', text: '\r' },
    });
    expect(await Promise.all([first, second])).toEqual([
      { status: 'ok' },
      { status: 'ok' },
    ]);
    expect(await readTerminal(host)).toMatchObject({
      closed: true,
      exitCode: 0,
    });
    expect((await host.caller.agents.authState(subject)).pending).toBeNull();
  },
);

it(
  'a sign-in program exiting non-zero fails the attempt and clears pending',
  terminalStartup,
  async () => {
    const host = await startTerminalAuth({ args: ['--auth-fail'] });

    expect(
      await host.caller.agents.authenticate({ ...subject, methodId }),
    ).toEqual({
      status: 'failed',
      message: 'Login command failed with exit code: 7',
    });
    expect(await readTerminal(host)).toMatchObject({
      closed: true,
      exitCode: 7,
    });
    expect((await host.caller.agents.authState(subject)).pending).toBeNull();
  },
);

it('reading, writing or cancelling the sign-in terminal never starts an Agent', async () => {
  const host = await startAcpEngine({
    ...terminalLogin,
    responses: {},
    steps: [],
  });

  expect(await readTerminal(host)).toEqual({
    cursor: 0,
    output: '',
    closed: true,
  });
  await host.caller.agents.authTerminalInput({
    ...subject,
    input: { type: 'write', text: '\r' },
  });
  await host.caller.agents.cancelAuthenticate(subject);
  expect(host.agent.processes).toHaveLength(0);
});

it(
  'reading or writing the sign-in terminal after the Agent is lost never launches a replacement',
  terminalStartup,
  async () => {
    const host = await startTerminalAuth({ args: ['--interactive-login'] });
    const result = host.caller.agents.authenticate({ ...subject, methodId });
    await awaitPrompt(host);
    const agent = requireScriptedProcessAt(host.agent.processes, 1);
    agent.exited.resolve();
    agent.connection.close();
    expect(await result).toMatchObject({ status: 'failed' });
    expect(await readTerminal(host)).toMatchObject({ closed: true });
    await host.caller.agents.authTerminalInput({
      ...subject,
      input: { type: 'write', text: '\r' },
    });
    expect(host.agent.processes).toHaveLength(2);
  },
);

// The vendor table keys these patterns by Agent id; the first fixture Registry id is the one it lists.
const claudeAgent = String(fixtureRegistryIds[0]);

it.each(['Login successful', 'Type your message'])(
  'claude-login succeeds on %s and kills the still-running PTY',
  terminalStartup,
  async (pattern) => {
    const host = await startTerminalAuth(
      {
        id: 'claude-login',
        args: ['--auth-pattern', pattern],
        env: { ARGO_AUTH_VALUE: 'method-env' },
      },
      claudeAgent,
    );

    expect(
      await host.caller.agents.authenticate({
        ...subject,
        agent: claudeAgent,
        methodId: 'claude-login',
      }),
    ).toEqual({ status: 'ok' });
    expect(await readTerminal(host, claudeAgent)).toMatchObject({
      closed: true,
      output: expect.stringContaining('method-env'),
    });
  },
);
