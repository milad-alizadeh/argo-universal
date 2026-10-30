import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FeedActorRef, FeedInput } from '../../feed';
import type { SessionData } from '../session-data';
import { flushSubagents, routeSubagents, type Subagents } from './routing';
import type { SubagentRouting } from './routing-types';

export { flushSubagents, type Subagents };

// The Session a Subagent update arrives on: its data and the machine input it was opened with, its own Feed, how a child's Feed starts, and how failing storage is reported.
export type SubagentSession = {
  parent: SessionData & {
    input: Pick<SubagentRouting, 'database' | 'now' | 'createId' | 'writer'>;
  };
  // The Session's own Feed, started with its open state; a Subagent update cannot arrive without it.
  parentFeed: FeedActorRef | undefined;
  spawn: SubagentRouting['spawn'];
  storageFailing: () => void;
};

// What the Session spawns a Subagent's Feed with: a child actor id per Subagent Session, and a system id to find it by.
export type SubagentFeedOptions = {
  id: `subagent:${string}`;
  systemId: string;
  input: FeedInput;
};

export const subagentFeed = (input: FeedInput): SubagentFeedOptions => ({
  id: `subagent:${input.sessionId}`,
  systemId: `subagent-feed:${input.sessionId}`,
  input,
});

export const noSubagents: Subagents = {
  children: new Map(),
  pendingMessages: [],
};

// Updates whose names say they concern a Subagent, and anything sent under the id of one already known.
const subagentUpdates = new Set<string>([
  'subagent_update',
  'session_message',
  'session_message_chunk',
]);

export const ownsSubagentUpdate = (
  subagents: Subagents,
  notification: SessionNotification,
): boolean =>
  subagentUpdates.has(notification.update.sessionUpdate) ||
  subagents.children.has(notification.sessionId);

export const hasRunningSubagentTurn = (subagents: Subagents): boolean =>
  [...subagents.children.values()].some((child) => child.turnId !== null);

type SessionStorage = Pick<
  SubagentRouting,
  'database' | 'now' | 'createId' | 'writer' | 'write'
>;

// Only the fields routing uses; the Session's machine input carries more.
const sessionStorage = ({
  database,
  now,
  createId,
  writer,
}: SubagentSession['parent']['input']): SessionStorage => ({
  database,
  now,
  createId,
  writer,
  write: (job) => writer.send({ type: 'writer.write', job }),
});

const routing = (
  { parent, spawn, storageFailing }: SubagentSession,
  parentFeed: FeedActorRef,
): SubagentRouting => ({
  ...sessionStorage(parent.input),
  parent,
  parentId: parent.sessionId,
  spawn,
  parentFeed,
  storageFailing,
});

// Throws rather than drop the update when the Session has no Feed to attach the Subagent to.
export const routeSubagentUpdate = (
  session: SubagentSession,
  subagents: Subagents,
  notification: SessionNotification,
): Subagents => {
  if (!session.parentFeed)
    throw new Error(
      `Session ${session.parent.sessionId} has no Feed to route a Subagent update to`,
    );

  return routeSubagents(
    routing(session, session.parentFeed),
    subagents,
    notification,
  );
};
