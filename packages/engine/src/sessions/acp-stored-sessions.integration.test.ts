import type {
  LoadSessionRequest,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import type { SessionPromptOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { storedMessage } from '#mocks/feed';
import { FeedRowsJob } from '../feed';
import { writeJobs } from '../storage';

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
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: storedHistory,
      maxRevision: 2,
    }),
  ]);

  return host;
};

const readStoredFeed = (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
): ReturnType<typeof host.caller.feed.page> =>
  host.caller.feed.page({ sessionId: 'session-1', direction: 'tail' });

// The load and prompt requests the Agent received.
interface AgentSessionCalls {
  loads: LoadSessionRequest[];
  prompts: PromptRequest[];
}

const startEngineRefusingResume = (
  agentSessionCalls: AgentSessionCalls,
): ReturnType<typeof startEngineWithStoredSession> =>
  startEngineWithStoredSession({
    steps: [],
    responses: {
      'session/resume': [
        {
          error: {
            code: -32002,
            message: 'Resource not found',
            data: { uri: nativeSessionId },
          },
        },
      ],
      'session/load': [{ requests: agentSessionCalls.loads }],
      'session/prompt': [{ requests: agentSessionCalls.prompts }],
    },
  });

const promptStoredSession = (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
): Promise<SessionPromptOutput> =>
  host.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Continue' }],
  });

it('refuses a prompt to an old Session the Agent cannot resume with the Agent reason', async () => {
  const host = await startEngineRefusingResume({ loads: [], prompts: [] });

  await expect(promptStoredSession(host)).rejects.toThrow('Resource not found');
});

it('keeps an unresumable old Session history as stored without loading or prompting an Agent session', async () => {
  const agentSessionCalls: AgentSessionCalls = { loads: [], prompts: [] };

  const host = await startEngineRefusingResume(agentSessionCalls);

  await promptStoredSession(host).catch(() => {});

  expect({ agentSessionCalls, feed: await readStoredFeed(host) }).toEqual({
    agentSessionCalls: { loads: [], prompts: [] },
    feed: expect.objectContaining({ rows: storedHistory, maxRevision: 2 }),
  });
});

it('reading an old Session Feed starts no Agent process', async () => {
  const host = await startEngineWithStoredSession({ steps: [] });

  expect({
    feed: await readStoredFeed(host),
    processes: host.agent.processes.length,
  }).toEqual({
    feed: expect.objectContaining({ rows: storedHistory }),
    processes: 0,
  });
});

it('reopens a stored Session with an Agent that supports load but not resume', async () => {
  const loads: LoadSessionRequest[] = [];
  const prompts: PromptRequest[] = [];

  const host = await startEngineWithStoredSession({
    steps: [],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: { loadSession: true },
    },
    responses: {
      'session/load': [
        {
          requests: loads,
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'Replayed history' },
              },
            },
          ],
        },
      ],
      'session/prompt': [{ requests: prompts }],
    },
  });

  await promptStoredSession(host);
  expect(loads).toHaveLength(1);
  expect(loads[0]?.sessionId).toBe(nativeSessionId);
  await expect.poll(() => prompts.length).toBe(1);
  const rows = (await readStoredFeed(host)).rows;
  expect(rows.slice(0, 2)).toEqual(storedHistory);
  expect(JSON.stringify(rows)).not.toContain('Replayed history');
});
