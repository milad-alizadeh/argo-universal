import type { SessionNotification } from '@agentclientprotocol/sdk';
import { SessionRowUpdateJob } from '../session-storage';
import {
  openChildFeed,
  type ChildFeed,
  type OpenedChildFeed,
} from './child-feed';
import type { SubagentRouting } from './routing-types';
import { deliverSubagentMessage, isSubagentMessage } from './subagent-messages';
import { associationEvent } from './subagent-rows';
import { subagentWorkState } from './subagent-work';
import { updateSubagentWork } from './work';

export type Subagents = {
  children: ReadonlyMap<string, ChildFeed>;
  pendingMessages: readonly SessionNotification[];
};

type Association = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'subagent_update' }
>;

function openOrKnown(
  input: SubagentRouting,
  children: Map<string, ChildFeed>,
  vendorId: string,
): OpenedChildFeed {
  const known = children.get(vendorId);

  return known
    ? { child: known, spawned: false }
    : openChildFeed(input, vendorId);
}

function associate(
  input: SubagentRouting,
  children: Map<string, ChildFeed>,
  vendorId: string,
): OpenedChildFeed | undefined {
  const association = openOrKnown(input, children, vendorId);

  if (association.child.parentId !== input.parentId) return undefined;
  children.set(vendorId, association.child);

  return association;
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
  const association = associate(input, children, update.sessionId);

  if (!association) return;

  const { child } = association;

  titleUpdate(input, child, update);
  children.set(
    update.sessionId,
    updateSubagentWork(input, child, subagentWorkState(update.state)),
  );
  input.parentFeed.send(associationEvent(input, { ...association, update }));
}

function routeUpdate(
  input: SubagentRouting,
  children: Map<string, ChildFeed>,
  notification: SessionNotification,
): boolean | void {
  const { update } = notification;

  if (update.sessionUpdate === 'subagent_update')
    return updateAssociation(input, children, update);

  if (isSubagentMessage(update))
    return deliverSubagentMessage(
      { ...input, children, transcriptId: notification.sessionId },
      update,
    );
  deliverChildUpdate(children, notification);
}

// Only explicit ACP associations establish parentage; an unknown id never becomes a Subagent.
export function routeSubagents(
  input: SubagentRouting,
  previous: Subagents,
  notification: SessionNotification,
): Subagents {
  const children = new Map(previous.children);
  const routing = routingSource(input, children.get(notification.sessionId));

  const pending = [...previous.pendingMessages];

  if (routeUpdate(routing, children, notification) === false)
    pending.push(notification);

  return {
    children,
    pendingMessages: retainedMessages(input, children, pending),
  };
}

export function flushSubagents(subagents: Subagents): void {
  for (const child of subagents.children.values())
    child.feed.send({ type: 'feed.flush' });
}

function deliverChildUpdate(
  children: ReadonlyMap<string, ChildFeed>,
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

function replayMessage(
  input: SubagentRouting,
  children: ReadonlyMap<string, ChildFeed>,
  notification: SessionNotification,
): boolean {
  if (!isSubagentMessage(notification.update)) return false;

  return deliverSubagentMessage(
    {
      ...routingSource(input, children.get(notification.sessionId)),
      children,
      transcriptId: notification.sessionId,
    },
    notification.update,
  );
}

const retainedMessages = (
  input: SubagentRouting,
  children: ReadonlyMap<string, ChildFeed>,
  pending: readonly SessionNotification[],
): readonly SessionNotification[] =>
  pending.filter((message) => !replayMessage(input, children, message));
