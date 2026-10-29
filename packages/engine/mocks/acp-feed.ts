import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  FeedSubscribeOutput,
  SessionSnapshot,
  SubagentUpdate,
} from '@repo/contracts';
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

  for await (const event of events) {
    const snapshot = matchingSnapshot(event, matches);

    if (snapshot) return snapshot;
  }

  throw new Error('The Feed closed before the expected Session snapshot');
};

const matchingSnapshot = (
  event: FeedSubscribeOutput,
  matches: (snapshot: SessionSnapshot) => boolean,
): SessionSnapshot | undefined => {
  if (event.type !== 'snapshot') return undefined;

  return matches(event.snapshot) ? event.snapshot : undefined;
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

type AcpFeedHost = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  sessionId: string;
};

export const openAcpFeedSession = async (
  updates: AcpFeedUpdates | ScriptedScenario,
  agentId = 'mock',
): Promise<AcpFeedHost> => {
  const host = await startAcpEngine(
    'steps' in updates ? updates : feedScenario(updates),
    undefined,
    agentId,
  );

  const created = await openFeedSession(host, agentId);

  await waitForAcpSessionIdle(host, created.sessionId);

  return { host, ...created };
};

const openFeedSession = (
  host: AcpFeedHost['host'],
  agentId: string,
): ReturnType<AcpFeedHost['host']['caller']['session']['new']> =>
  host.caller.session.new({
    ...emptySessionInput,
    agent: agentId,
    prompt: [{ type: 'text', text: 'Show the result' }],
  });

// The parent Feed's Subagent rows, in Feed order.
export const parentSubagentUpdates = async (
  host: Pick<Awaited<ReturnType<typeof startAcpEngine>>, 'caller'>,
  sessionId: string,
): Promise<SubagentUpdate[]> => {
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

  if (page.hasOlder) throw new Error('The parent Feed is longer than one page');

  return page.rows.flatMap((row) =>
    row.sessionUpdate === 'subagent_update' ? [row] : [],
  );
};
