import type { SessionNotification } from '@agentclientprotocol/sdk';
import { SessionRowUpdateJob } from '../session-storage';
import { openChildFeed, type ChildFeed } from '../subagents/child-feed';
import type { SubagentRouting } from '../subagents/routing-types';
import { updateSubagentWork } from '../subagents/work';
import { deliverSubagentMessage, isSubagentMessage, type MessageRouting } from './subagent-messages';
import { associationEvent } from './subagent-rows';
import { subagentWorkState } from './subagent-work';

export type SubagentFeeds = ReadonlyMap<string, ChildFeed>;

type Association = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'subagent_update' }
>;

function associate(
  input: SubagentRouting,
  children: Map<string, ChildFeed>,
  vendorId: string,
): ChildFeed | undefined {
  const child = children.get(vendorId) ?? openChildFeed(input, vendorId);

  if (child.parentId !== input.parentId) return undefined;
  children.set(vendorId, child);

  return child;
}

function titleUpdate(
  input: SubagentRouting,
  child: ChildFeed,
  update: Association,
): void {
  if (update.title === undefined) return;

  input.write(
    new SessionRowUpdateJob({
      id: child.sessionId,
      set: { title: update.title ?? '', titleSource: 'agent' },
    }),
  );
}

function updateAssociation(
  input: SubagentRouting,
  children: Map<string, ChildFeed>,
  update: Association,
): void {
  const child = associate(input, children, update.sessionId);

  if (!child) return;
  titleUpdate(input, child, update);
  children.set(
    update.sessionId,
    updateSubagentWork(input, child, subagentWorkState(update.state)),
  );
  input.parentFeed.send(associationEvent(input, child, update));
}

function routeUpdate(
  input: MessageRouting,
  children: Map<string, ChildFeed>,
  notification: SessionNotification,
): void {
  const { update } = notification;

  if (update.sessionUpdate === 'subagent_update')
    return updateAssociation(input, children, update);

  if (isSubagentMessage(update))
    return deliverSubagentMessage(input, children, update);
  deliverChildUpdate(children, notification);
}

// Only explicit ACP associations establish parentage; an unknown id never becomes a Subagent.
export function routeSubagentUpdate(
  input: SubagentRouting,
  previous: SubagentFeeds,
  notification: SessionNotification,
): SubagentFeeds {
  const children = new Map(previous);
  const source = children.get(notification.sessionId);

  const routing = routingSource(input, source);

  routeUpdate(
    { ...routing, associate: (id) => associate(routing, children, id) },
    children,
    notification,
  );

  return children;
}

export function flushSubagentFeeds(children: SubagentFeeds): void {
  for (const child of children.values())
    child.feed.send({ type: 'feed.flush' });
}

function deliverChildUpdate(
  children: SubagentFeeds,
  notification: SessionNotification,
): void {
  const source = children.get(notification.sessionId);

  source?.feed.send({
    type: 'feed.acpUpdate',
    acpSessionId: notification.sessionId,
    update: notification.update,
    turnId: source.turnId,
  });
}

function routingSource(
  input: SubagentRouting,
  source: ChildFeed | undefined,
): SubagentRouting {
  if (!source) return input;

  return { ...input, parentId: source.sessionId, parentFeed: source.feed };
}
