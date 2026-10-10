import { RequestError } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { storedMessage } from '#mocks/feed';
import { writeJobs } from '../feed';

const nativeSessionId = 'native-thread-1';
const storedHistory = [storedMessage(0), storedMessage(1)];

const startEngineWithStoredSession = async (
  peerInput: Parameters<typeof startAcpEngine>[0],
): Promise<Awaited<ReturnType<typeof startAcpEngine>>> => {
  const host = await startAcpEngine(peerInput);
  host.database.$client
    .prepare('UPDATE session SET vendor_session_id = ? WHERE id = ?')
    .run(nativeSessionId, 'session-1');
  writeJobs(host.database, [
    {
      type: 'feedRows',
      sessionId: 'session-1',
      rows: storedHistory,
      maxRevision: 2,
    },
  ]);
  return host;
};

const readStoredFeed = (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
): ReturnType<typeof host.caller.feed.page> =>
  host.caller.feed.page({ sessionId: 'session-1', direction: 'tail' });

it('an old Session whose upstream context cannot resume keeps its history readable without importing Agent sessions', async () => {
  const imported: string[] = [];
  const host = await startEngineWithStoredSession({
    resumeSession: () => {
      throw RequestError.resourceNotFound(nativeSessionId);
    },
    loadSession: ({ params }) => {
      imported.push(params.sessionId);
      return {};
    },
    prompt: ({ params }) => {
      imported.push(params.sessionId);
      return { stopReason: 'end_turn' };
    },
  });

  await expect(
    host.caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Continue' }],
    }),
  ).rejects.toThrow('Resource not found');

  expect({ imported, feed: await readStoredFeed(host) }).toEqual({
    imported: [],
    feed: expect.objectContaining({ rows: storedHistory, maxRevision: 2 }),
  });
});

it('reading an old Session Feed starts no Agent process', async () => {
  const host = await startEngineWithStoredSession({});

  expect({
    feed: await readStoredFeed(host),
    processes: host.peer.processes.length,
  }).toEqual({
    feed: expect.objectContaining({ rows: storedHistory }),
    processes: 0,
  });
});
