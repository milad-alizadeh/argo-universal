import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { SessionSnapshot } from '@repo/contracts';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { emptySessionInput, startAcpEngine } from './acp-engine';

export type AcpFeedUpdates = SessionNotification['update'][];
export const waitForAcpSnapshot = async (
  host: Pick<Awaited<ReturnType<typeof startAcpEngine>>, 'caller'>,
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
  host: Pick<Awaited<ReturnType<typeof startAcpEngine>>, 'caller'>,
  sessionId: string,
): Promise<void> => {
  await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.state === 'idle' && snapshot.activeTurnId === null,
  );
};
export const openAcpFeedSession = async (
  updates: AcpFeedUpdates | ScriptedScenario,
  agentId = 'mock',
): Promise<{
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  sessionId: string;
}> => {
  const host = await startAcpEngine(
    'steps' in updates ? updates : feedScenario(updates),
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
