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

const startEngineRefusingResume = (
  agentSessionCalls: string[],
): ReturnType<typeof startEngineWithStoredSession> =>
  startEngineWithStoredSession({
    resumeSession: () => {
      throw RequestError.resourceNotFound(nativeSessionId);
    },
    loadSession: ({ params }) => {
      agentSessionCalls.push(`load ${params.sessionId}`);
      return {};
    },
    prompt: ({ params }) => {
      agentSessionCalls.push(`prompt ${params.sessionId}`);
      return { stopReason: 'end_turn' };
    },
  });
const promptStoredSession = (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
): Promise<unknown> =>
  host.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Continue' }],
  });

it('refuses a prompt to an old Session the Agent cannot resume with the Agent reason', async () => {
  const host = await startEngineRefusingResume([]);

  await expect(promptStoredSession(host)).rejects.toThrow('Resource not found');
});

it('keeps an unresumable old Session history as stored without loading or prompting an Agent session', async () => {
  const agentSessionCalls: string[] = [];
  const host = await startEngineRefusingResume(agentSessionCalls);

  await promptStoredSession(host).catch(() => {});

  expect({ agentSessionCalls, feed: await readStoredFeed(host) }).toEqual({
    agentSessionCalls: [],
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
