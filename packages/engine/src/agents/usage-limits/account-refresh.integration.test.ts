import { expect, it, onTestFinished } from 'vitest';
import {
  createResourceOpening,
  deferLaunch,
  resourceLaunch,
} from '#mocks/acp-resource';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { createAcpResources } from '../acp';
import { vendorRegistryIds } from '../vendor';

const accountServer = `
  const { createInterface } = require('node:readline');
  const input = createInterface({ input: process.stdin });
  input.on('line', (line) => {
    const request = JSON.parse(line);
    if (request.method === 'initialized') return;
    if (request.method === 'initialize') {
      console.log(JSON.stringify({ id: request.id, result: {} }));
      return;
    }
    if (request.method !== 'account/rateLimits/read') process.exit(1);
    const primary = { usedPercent: 30, windowDurationMins: 300, resetsAt: 1795280400 };
    const secondary = { usedPercent: 70, windowDurationMins: 10080, resetsAt: 1795512362 };
    console.log(JSON.stringify({ id: request.id, result: { rateLimits: { primary, secondary } } }));
  });
`;

it('publishes the installed Agent’s account windows when a Session opens', async () => {
  const resources = createAcpResources(
    createScriptedAgentProcess({ steps: [] }),
  );

  onTestFinished(() => resources.shutdown());
  const { agentId: agent, projectId } = resourceLaunch;

  const launch = deferLaunch({
    ...resourceLaunch,
    registryId: vendorRegistryIds.codex,
    cwd: process.cwd(),
    executable: process.execPath,
    args: ['-e', accountServer, '--'],
  });

  await resources.open({
    ...createResourceOpening(),
    launch,
    sessionId: 'session',
  });

  await expect
    .poll(() => resources.usageLimits.read({ agent, projectId }))
    .toMatchObject({
      limits: [
        { window: 'five_hour', measure: { kind: 'fraction', used: 0.3 } },
        { window: 'week', measure: { kind: 'fraction', used: 0.7 } },
      ],
    });
});
