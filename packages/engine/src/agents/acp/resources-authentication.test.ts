import { terminalLogin } from '@repo/mocks/agent/terminal-login';
import { expect, it, vi } from 'vitest';
import { createResourceOpening, resourceLaunch } from '#mocks/acp-resource';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
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

it('an authentication held across shutdown cannot start a sign-in terminal', async () => {
  const launchAuthTerminal = vi.fn<LaunchLoginTerminal>();

  const resources = createAcpResources({
    ...createScriptedAgentProcess({
      ...terminalLogin,
      responses: {},
      steps: [],
    }),
    launchAuthTerminal,
  });

  const authentication = await resources.authentication(resourceLaunch);

  await resources.shutdown();
  expect(await authentication.authenticate('interactive-subscription')).toEqual(
    { status: 'failed', message: 'The Agent has stopped' },
  );
  expect(authentication.state().pending).toBeNull();
  expect(launchAuthTerminal).not.toHaveBeenCalled();
});
