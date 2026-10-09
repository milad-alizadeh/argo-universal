import type { LoadSessionResponse } from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import { acpPermission } from '#mocks/acp-requests';
import {
  createResourcePeer,
  createResourceOpening,
  createResourceDestination,
  requireResourceProcessAt,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('unknown and withdrawn question ownership returns cancellation without consulting any destination', async () => {
  const loaded = Promise.withResolvers<LoadSessionResponse>();
  let questions = 0;
  let requestedLoad = false;
  const peer = createResourcePeer({
    loadSession: () => {
      requestedLoad = true;
      return loaded.promise;
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
  await vi.waitFor(() => expect(requestedLoad).toBe(true));
  abort.abort();
  const process = requireResourceProcessAt(peer.processes);
  for (const sessionId of ['unknown', 'withdrawn']) {
    const response = await process.connection.client.request(
      'session/request_permission',
      {
        ...acpPermission,
        sessionId,
      },
    );
    expect(response).toEqual({ outcome: { outcome: 'cancelled' } });
  }
  expect(questions).toBe(0);
  loaded.resolve({});
  expect(await opening).toMatchObject({ name: 'AbortError' });
  expect(process.terminations).toBe(0);
  await survivor.close();
});
