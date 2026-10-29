import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { expect, it, onTestFinished } from 'vitest';
import { z } from 'zod';
import { startAcpEngine } from '#mocks/acp-engine';
import { operationCaller } from '#mocks/operations';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { agentEnvironment } from '../agents';

it('revokes access and stops the private process when a pending Session open is closed', async () => {
  const initialized = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();
  onTestFinished(() => release.resolve());

  const peer = createScriptedAgentProcess({
    steps: [],
    responses: {
      'session/new': [{ received: initialized, waitFor: release.promise }],
    },
  });

  const environment = Promise.withResolvers<NodeJS.ProcessEnv>();

  const host = await startAcpEngine({
    steps: [],
    launchProcess: async (launch) => {
      environment.resolve(await agentEnvironment(launch));

      return peer.launchProcess(launch);
    },
  });

  const opening = host.caller.session.open({ sessionId: 'session-1' });

  const outcome = Promise.allSettled([opening]);
  await initialized.promise;
  const token = z.string().parse((await environment.promise).ARGO_TOKEN);
  const caller = await operationCaller(host, token);
  await host.caller.session.close({ sessionId: 'session-1' });
  expect(await outcome).toMatchObject([
    { status: 'rejected', reason: { code: 'CONFLICT' } },
  ]);
  await expect(caller.operations.list.query()).rejects.toMatchObject({
    data: { code: 'UNAUTHORIZED' },
  });
  await expect
    .poll(() => requireScriptedProcessAt(peer.processes).terminations)
    .toBe(1);
});
