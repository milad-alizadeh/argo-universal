import type { SessionNotification } from '@agentclientprotocol/sdk';
import {
  SubagentState,
  type FeedUpdate,
  type SubagentUpdate,
} from '@repo/contracts';
import { type FeedEvent } from '../../feed';
import type { AssociatedChild } from './declared-roles';
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

type AssociationChange = AssociatedChild & { update: Association };

type ArgoExtension = NonNullable<NonNullable<SubagentUpdate['_meta']>['argo']>;

// ACP's `description` is the child's role or purpose; claude-agent-acp sends its `subagent_type` there.
const roleOf = ({ description }: Association): string | undefined =>
  description?.trim() ? description : undefined;

const wrappedMeta = (
  extension: ArgoExtension,
): Pick<SubagentUpdate, '_meta'> =>
  Object.keys(extension).length ? { _meta: { argo: extension } } : {};

// The role the Agent reports, and the one its Session declared before the spawn.
function roleFields({
  update,
  declaredRole,
}: AssociationChange): ArgoExtension {
  const fields: ArgoExtension = {};
  const role = roleOf(update);

  if (role) fields.role = role;

  if (declaredRole) fields.declaredRole = declaredRole;

  return fields;
}

// The first update for a new child is its `spawn` (#930).
const associationMeta = (
  association: AssociationChange,
): Pick<SubagentUpdate, '_meta'> => {
  const extension = roleFields(association);

  if (association.spawned) extension.action = 'spawn';

  return wrappedMeta(extension);
};

const associationRow = (
  input: SubagentRouting,
  association: AssociationChange,
): FeedUpdate => ({
  id: input.createId(),
  sessionUpdate: 'subagent_update',
  state: 'settled',
  subagentSessionId: association.child.sessionId,
  ...titleField(association.update.title),
  ...stateField(association.update.state?.state),
  ...associationMeta(association),
});

export const associationEvent = (
  input: SubagentRouting,
  association: AssociationChange,
): FeedEvent => ({
  type: 'feed.change',
  turnId: null,
  change: { type: 'upsert', update: associationRow(input, association) },
});
