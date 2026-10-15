import { expect, it } from 'vitest';
import { createResourceOpening, resourceLaunch } from '#mocks/acp-resource';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
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
