import { terminalLogin } from '@repo/mocks/agent/terminal-login';
import { expect, it, vi } from 'vitest';
import { resourceLaunch } from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import type { LaunchLoginTerminal } from '../../agent-launch';
import { createAcpResources } from '../index';

it.each(['stopping', 'stopped'])(
  'an authentication held while resources are %s cannot start a sign-in terminal',
  async (phase) => {
    const launchLoginTerminal = vi.fn<LaunchLoginTerminal>();

    const agent = createScriptedAgentProcess({
      ...terminalLogin,
      responses: {},
      steps: [],
      autoExit: false,
    });

    const resources = createAcpResources({ ...agent, launchLoginTerminal });
    const authentication = await resources.authentication(resourceLaunch);
    const shutdown = resources.shutdown();
    const child = requireScriptedProcessAt(agent.processes);

    if (phase === 'stopped') {
      child.exited.resolve();
      await shutdown;
    }

    expect(
      await authentication.authenticate('interactive-subscription'),
    ).toEqual({ status: 'failed', message: 'The Agent has stopped' });
    expect(authentication.state().pending).toBeNull();
    expect(launchLoginTerminal).not.toHaveBeenCalled();
    child.exited.resolve();
    await shutdown;
  },
);
