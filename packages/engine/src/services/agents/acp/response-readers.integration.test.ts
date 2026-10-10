import { expect, it, vi } from 'vitest';
import { createAcpPeer, readAcpRequest } from '#mocks/acp-peer';
import {
  createResourceOpening,
  resourceInitialization,
} from '#mocks/acp-resource';
import type { AcpProcess } from './resource-types';
import { createAcpResources } from './resources';

it('rejects an unchecked malformed opening response through the resource and counts it once', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const peer = createAcpPeer();
  const exited = Promise.withResolvers<void>();
  const resources = createAcpResources({
    launchProcess: async (): Promise<AcpProcess> => ({
      stream: peer.stream,
      exited: exited.promise,
      terminate: async () => exited.resolve(),
    }),
  });
  try {
    const opening = resources
      .open(createResourceOpening())
      .catch((error: unknown) => error);
    const initialize = await readAcpRequest(peer);
    expect(initialize.method).toBe('initialize');
    await peer.send([
      { jsonrpc: '2.0', id: initialize.id, result: resourceInitialization },
    ]);
    const request = await readAcpRequest(peer);
    expect(request.method).toBe('session/new');
    await peer.send([
      { jsonrpc: '2.0', id: request.id, result: { sessionId: 42 } },
    ]);
    expect(await opening).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('sessionId must be string'),
      }),
    );
    const reports = log.mock.calls.filter(
      ([line]) => typeof line === 'string' && line.startsWith('ACP responses:'),
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]?.[0]).toContain('#1');
  } finally {
    await resources.shutdown();
    log.mockRestore();
  }
});
