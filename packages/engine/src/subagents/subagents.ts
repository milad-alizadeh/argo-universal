import type { FeedActorRef } from '../feed';
import type { AcpLifetimeEvent } from '../sessions/acp/acp-lifetime';
import {
  acpUpdateEvent,
  writeFeedEvent,
  type SessionContext,
  type SessionEvent,
} from '../sessions/session-context';
import type { SubagentRouting } from './routing-types';
import { routeSubagentUpdate, type SubagentFeeds } from './subagent-feeds';

type AcpUpdate = Extract<AcpLifetimeEvent, { type: 'acp.update' }>;

type SubagentRoute = {
  context: SessionContext;
  notification: AcpUpdate['notification'];
  // The Session's own Feed, started with its open state; a Subagent update cannot arrive without it.
  parentFeed: FeedActorRef | undefined;
  spawn: SubagentRouting['spawn'];
  storageFailing: () => void;
};

export const isSubagentUpdate = (
  context: SessionContext,
  event: SessionEvent,
): boolean =>
  event.type === acpUpdateEvent &&
  (event.notification.update.sessionUpdate === 'subagent_update' ||
    event.notification.update.sessionUpdate === 'session_message' ||
    event.notification.update.sessionUpdate === 'session_message_chunk' ||
    context.subagentFeeds.children.has(event.notification.sessionId));

// Throws rather than drop the update when the Session has no Feed to attach the Subagent to.
export const routeSubagentNotification = ({
  context,
  notification,
  parentFeed,
  spawn,
  storageFailing,
}: SubagentRoute): SubagentFeeds => {
  if (!parentFeed)
    throw new Error(
      `Session ${context.sessionId} has no Feed to route a Subagent update to`,
    );

  const { writer } = context.input;

  return routeSubagentUpdate(
    {
      parent: context,
      parentId: context.sessionId,
      database: context.input.database,
      now: context.input.now,
      createId: context.input.createId,
      writer,
      write: (job) => writer.send({ type: writeFeedEvent, job }),
      storageFailing,
      parentFeed,
      spawn,
    },
    context.subagentFeeds,
    notification,
  );
};
