import type { SessionNotification } from '@agentclientprotocol/sdk';
import {
  SubagentState,
  type FeedUpdate,
  type SubagentUpdate,
} from '@repo/contracts';
import { z } from 'zod';
import { type FeedEvent } from '../../feed';
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

const ClaudeRole = z.object({
  claudeCode: z.object({
    subagentRole: z.string().refine((value) => value.trim().length > 0),
  }),
});

const roleOf = (update: Association): string | undefined => {
  const parsed = ClaudeRole.safeParse(update._meta);

  return parsed.success ? parsed.data.claudeCode.subagentRole : undefined;
};

const wrappedMeta = (
  argo: NonNullable<NonNullable<SubagentUpdate['_meta']>['argo']>,
): Pick<SubagentUpdate, '_meta'> =>
  Object.keys(argo).length ? { _meta: { argo } } : {};

// The first update for a new child is its `spawn` (#930).
const associationMeta = (
  spawned: boolean,
  update: Association,
): Pick<SubagentUpdate, '_meta'> => {
  const role = roleOf(update);
  const argo: NonNullable<NonNullable<SubagentUpdate['_meta']>['argo']> = {};

  if (spawned) argo.action = 'spawn';

  if (role) argo.role = role;

  return wrappedMeta(argo);
};

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
  ...associationMeta(spawned, update),
});

export const associationEvent = (
  input: SubagentRouting,
  association: AssociationChange,
): FeedEvent => ({
  type: 'feed.change',
  turnId: null,
  change: { type: 'upsert', update: associationRow(input, association) },
});
