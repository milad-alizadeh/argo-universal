import { terminalLogin } from '@repo/mocks/agent/terminal-login';
import { expect, it, vi } from 'vitest';
import { createResourceOpening, resourceLaunch } from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import type { LaunchLoginTerminal } from '../agent-launch';
import { createAcpResources } from './index';

it('authentication reservation stays a pass-through while the legacy login stack exists', async () => {
  const peer = createScriptedAgentProcess({ steps: [] });
  const resources = createAcpResources(peer);
  const release = resources.reserveAuthentication(resourceLaunch);
  const second = resources.reserveAuthentication(resourceLaunch);
  const lease = await resources.open(createResourceOpening());
  release();
  second();
  await lease.close();
  await resources.shutdown();
  expect(peer.processes).toHaveLength(1);
});

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
