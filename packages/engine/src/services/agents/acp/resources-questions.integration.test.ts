import type {
  RequestPermissionResponse,
  LoadSessionResponse,
  LoadSessionRequest,
} from '@agentclientprotocol/sdk';
import { acpPermission } from '@repo/mocks/agent/permission-scenario';
import { expect, it } from 'vitest';
import {
  createResourceOpening,
  createResourceDestination,
} from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createAcpResources } from '../index';

it('unknown and withdrawn question ownership returns cancellation without consulting any destination', async () => {
  const loaded = Promise.withResolvers<LoadSessionResponse>();
  const requestedLoad = Promise.withResolvers<LoadSessionRequest>();
  let questions = 0;
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: {
      'session/load': [{ result: loaded.promise, received: requestedLoad }],
    },
  });
  const resources = createAcpResources(peer);
  const survivor = await resources.open(createResourceOpening());
  const abort = new AbortController();
  const opening = resources
    .open({
      ...createResourceOpening({
        ...createResourceDestination(),
        requestPermission: () => {
          questions += 1;
          return { outcome: { outcome: 'cancelled' } };
        },
      }),
      opening: {
        method: 'session/load',
        params: {
          sessionId: 'withdrawn',
          cwd: '/checkout',
          mcpServers: [],
        },
      },
      signal: abort.signal,
    })
    .catch((error: unknown): unknown => error);
  await requestedLoad.promise;
  abort.abort();
  const process = requireScriptedProcessAt(peer.processes);
  for (const sessionId of ['unknown', 'withdrawn']) {
    const answers: RequestPermissionResponse[] = [];
    await process.play(
      [{ type: 'permission', request: acpPermission, responses: answers }],
      sessionId,
    );
    const response = answers[0];
    expect(response).toEqual({ outcome: { outcome: 'cancelled' } });
  }
  expect(questions).toBe(0);
  loaded.resolve({});
  expect(await opening).toMatchObject({ name: 'AbortError' });
  expect(process.terminations).toBe(0);
  await survivor.close();
});
