import type {
  AgentRequestHandlersByMethod,
  SessionNotification,
} from '@agentclientprotocol/sdk';
import type { SessionSnapshot } from '@repo/contracts';
import { emptySessionInput, startAcpEngine } from './acp-engine';

export type AcpFeedUpdates = SessionNotification['update'][];
type PromptContext = Parameters<
  AgentRequestHandlersByMethod['session/prompt']
>[0];
export const sendAcpFeedUpdates = async (
  request: PromptContext,
  updates: AcpFeedUpdates,
): Promise<void> => {
  for (const update of updates)
    await request.client.notify('session/update', {
      sessionId: request.params.sessionId,
      update,
    });
};
export const waitForAcpSnapshot = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  sessionId: string,
  matches: (snapshot: SessionSnapshot) => boolean,
): Promise<SessionSnapshot> => {
  const events = await host.caller.feed.subscribe({ sessionId, after: null });
  for await (const event of events)
    if (event.type === 'snapshot' && matches(event.snapshot))
      return event.snapshot;
  throw new Error('The Feed closed before the expected Session snapshot');
};
export const waitForAcpSessionIdle = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  sessionId: string,
): Promise<void> => {
  await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.state === 'idle' && snapshot.activeTurnId === null,
  );
};
export const openAcpFeedSession = async (
  updates: AcpFeedUpdates,
  agentId = 'mock',
): Promise<{
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  sessionId: string;
}> => {
  const host = await startAcpEngine(
    {
      prompt: async (request) => {
        await sendAcpFeedUpdates(request, updates);
        return { stopReason: 'end_turn' };
      },
    },
    undefined,
    agentId,
  );
  const created = await host.caller.session.new({
    ...emptySessionInput,
    agent: agentId,
    prompt: [{ type: 'text', text: 'Show the result' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  return { host, ...created };
};
