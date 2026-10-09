import type {
  AgentRequestHandlersByMethod,
  SessionNotification,
} from '@agentclientprotocol/sdk';
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
export const waitForAcpSessionIdle = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  sessionId: string,
): Promise<void> => {
  const events = await host.caller.feed.subscribe({ sessionId, after: null });
  for await (const event of events)
    if (
      event.type === 'snapshot' &&
      event.snapshot.state === 'idle' &&
      event.snapshot.activeTurnId === null
    )
      return;
  throw new Error('The Feed closed before the Session became idle');
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
