import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { terminalLogin } from '@repo/mocks/agent/terminal-login';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { resourceLaunch } from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from '../acp';

const subject = { agent: 'mock', projectId: 'project-1' };

const methodId = 'interactive-subscription';

it.each(['stopping', 'stopped'])(
  'a retained authentication manager cannot launch a PTY while resources are %s',
  async (phase) => {
    const agent = createScriptedAgentProcess({
      ...terminalLogin,
      steps: [],
      autoExit: false,
    });

    const resources = createAcpResources(agent);
    onTestFinished(async () => {
      for (const child of agent.processes) child.exited.resolve();
      await resources.shutdown();
    });

    const auth = await resources.authentication({
      ...resourceLaunch,
      ...scriptedAgentCommand('reply'),
      cwd: process.cwd(),
    });

    onTestFinished(() => auth.cancel());
    const shutdown = resources.shutdown();
    const child = requireScriptedProcessAt(agent.processes);

    if (phase === 'stopped') {
      child.exited.resolve();
      await shutdown;
    }

    expect(await auth.authenticate(methodId)).toEqual({
      status: 'failed',
      message: 'Agent connection is stopped',
    });
    expect(auth.state().pending).toBeNull();
    expect(auth.readTerminal(0)).toEqual({
      cursor: 0,
      output: '',
      closed: true,
    });
    child.exited.resolve();
    await shutdown;
  },
);

it(
  'terminal polling and input after connection loss never launch a replacement Agent',
  { timeout: 20_000 },
  async () => {
    const host = await startAcpEngine({
      ...terminalLogin,
      responses: {},
      steps: [],
    });

    await host.caller.session.new(emptySessionInput);
    const result = host.caller.agents.authenticate({ ...subject, methodId });
    await expect
      .poll(
        async () =>
          (await host.caller.agents.authTerminal({ ...subject, cursor: 0 }))
            .output,
        { timeout: 15_000 },
      )
      .toContain('Continue in your browser');
    const first = requireScriptedProcessAt(host.agent.processes);
    first.exited.resolve();
    first.connection.close();
    expect(await result).toMatchObject({ status: 'failed' });
    expect(
      await host.caller.agents.authTerminal({ ...subject, cursor: 0 }),
    ).toEqual({ cursor: 0, output: '', closed: true });
    await expect(
      host.caller.agents.authTerminalInput({
        ...subject,
        input: { type: 'write', text: '\r' },
      }),
    ).rejects.toThrow('Session connection is unavailable');
    expect(host.agent.processes).toHaveLength(1);
  },
);
