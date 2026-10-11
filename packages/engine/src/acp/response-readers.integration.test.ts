import type {
  InitializeRequest,
  NewSessionRequest,
} from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { createAcpResources } from './resources';

it('rejects an unchecked malformed opening response through the resource and counts it once', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const initialize = Promise.withResolvers<InitializeRequest>();
  const newSession = Promise.withResolvers<NewSessionRequest>();
  const peer = createScriptedAgentProcess({
    steps: [],
    responses: {
      initialize: [{ received: initialize }],
      'session/new': [{ rawResult: { sessionId: 42 }, received: newSession }],
    },
  });
  const resources = createAcpResources(peer);
  try {
    const opening = resources
      .open(createResourceOpening())
      .catch((error: unknown) => error);
    expect(await opening).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('sessionId must be string'),
      }),
    );
    await Promise.all([initialize.promise, newSession.promise]);
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
