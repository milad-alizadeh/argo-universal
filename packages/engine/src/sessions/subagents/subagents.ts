import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FeedActorRef } from '../../feed';
import type { WriterActorRef } from '../../storage';
import type { SessionData } from '../session-data';
import type { SubagentRouting } from './routing-types';
import {
  flushSubagentFeeds,
  routeSubagentFeeds,
  type Subagents,
} from './subagent-feeds';

export { crashedSubagentTurns } from './crash';

export type { Subagents };

// What a Session lends to route a Subagent update: its own data and Feed, the database, the Writer, and how a child's Feed starts.
export type SubagentHost = Pick<
  SubagentRouting,
  'database' | 'now' | 'createId' | 'spawn' | 'storageFailing'
> & {
  parent: SessionData;
  writer: WriterActorRef;
  // The Session's own Feed, started with its open state; a Subagent update cannot arrive without it.
  parentFeed: FeedActorRef | undefined;
};

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

export const flushSubagents = flushSubagentFeeds;

const routing = (
  host: SubagentHost,
  parentFeed: FeedActorRef,
): SubagentRouting => ({
  ...host,
  parentId: host.parent.sessionId,
  parentFeed,
  write: (job) => host.writer.send({ type: 'writer.write', job }),
});

// Throws rather than drop the update when the Session has no Feed to attach the Subagent to.
export const routeSubagentUpdate = (
  host: SubagentHost,
  subagents: Subagents,
  notification: SessionNotification,
): Subagents => {
  if (!host.parentFeed)
    throw new Error(
      `Session ${host.parent.sessionId} has no Feed to route a Subagent update to`,
    );

  return routeSubagentFeeds(
    routing(host, host.parentFeed),
    subagents,
    notification,
  );
};
