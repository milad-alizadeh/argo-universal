import type { SessionNotification } from '@agentclientprotocol/sdk';
import {
  SubagentState,
  type FeedUpdate,
  type SubagentUpdate,
} from '@repo/contracts';
import { type FeedEvent } from '../feed';
import type { OpenedChildFeed } from './child-feed';
import type { SubagentRouting } from './routing-types';

type Association = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'subagent_update' }
>;

const stateField = (
  state: string | undefined,
): Pick<SubagentUpdate, 'subagentState'> => ({
  subagentState: SubagentState.safeParse(state).data,
});

const titleField = (title: string | null | undefined): { title?: string } =>
  title === undefined ? {} : { title: title ?? '' };

type AssociationChange = OpenedChildFeed & { update: Association };

// The first update for a new child is its `spawn` (#930).
const spawnField = (spawned: boolean): Pick<SubagentUpdate, '_meta'> =>
  spawned ? { _meta: { argo: { action: 'spawn' } } } : {};

const associationRow = (
  input: SubagentRouting,
  { child, spawned, update }: AssociationChange,
): FeedUpdate => ({
  id: input.createId(),
  sessionUpdate: 'subagent_update',
  state: 'settled',
  subagentSessionId: child.sessionId,
  ...titleField(update.title),
  ...stateField(update.state?.state),
  ...spawnField(spawned),
});

export const associationEvent = (
  input: SubagentRouting,
  association: AssociationChange,
): FeedEvent => ({
  type: 'feed.change',
  turnId: null,
  change: { type: 'upsert', update: associationRow(input, association) },
});
