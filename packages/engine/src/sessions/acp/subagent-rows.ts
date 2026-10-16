import type { SessionNotification } from '@agentclientprotocol/sdk';
import {
  SubagentState,
  type FeedUpdate,
  type SubagentUpdate,
} from '@repo/contracts';
import { mapSupportedContentBlock, type FeedEvent } from '../../feed';
import type { ChildFeed } from '../subagents/child-feed';
import type { SubagentRouting } from '../subagents/routing-types';

type Association = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'subagent_update' }
>;

type Message = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'session_message' }
>;

const stateField = (
  state: string | undefined,
): Pick<SubagentUpdate, 'subagentState'> => ({
  subagentState: SubagentState.safeParse(state).data,
});

const titleField = (title: string | null | undefined): { title?: string } =>
  title === undefined ? {} : { title: title ?? '' };

const associationRow = (
  input: SubagentRouting,
  child: ChildFeed,
  update: Association,
): FeedUpdate => ({
  id: input.createId(),
  sessionUpdate: 'subagent_update',
  state: 'settled',
  subagentSessionId: child.sessionId,
  ...titleField(update.title),
  ...stateField(update.state?.state),
});

export const associationEvent = (
  input: SubagentRouting,
  child: ChildFeed,
  update: Association,
): FeedEvent => ({
  type: 'feed.change',
  turnId: null,
  change: { type: 'upsert', update: associationRow(input, child, update) },
});

const delegatedMessageRow = (
  input: SubagentRouting,
  update: Message,
): FeedUpdate => ({
  id: JSON.stringify(['session_message', input.parentId, update.messageId]),
  messageId: update.messageId,
  sessionUpdate: 'session_message',
  state: 'settled',
  content: (update.content ?? []).map(mapSupportedContentBlock),
  _meta: { argo: { senderSessionId: input.parentId } },
});

export const delegatedMessageEvent = (
  input: SubagentRouting,
  child: ChildFeed,
  update: Message,
): FeedEvent => ({
  type: 'feed.change',
  turnId: child.turnId,
  change: { type: 'upsert', update: delegatedMessageRow(input, update) },
});
