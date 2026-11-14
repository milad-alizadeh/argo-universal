import type { SubagentRole } from '@repo/contracts';
import type { OpenedChildFeed } from './child-feed';
import type { SubagentRouting } from './routing-types';

// A child as routing found it, with the role its Session declared for it when it was just spawned.
export type AssociatedChild = OpenedChildFeed & {
  declaredRole: SubagentRole | undefined;
};

type DeclaredRoleQueue = {
  take: () => SubagentRole | undefined;
  remaining: () => readonly SubagentRole[];
};

// One routed update's view of the roles the Session declared: it may take the oldest, and leaves the rest.
export const declaredRoleQueue = (
  declared: readonly SubagentRole[],
): DeclaredRoleQueue => {
  const queue = [...declared];

  return { take: () => queue.shift(), remaining: () => queue };
};

// Only an Agent the Session's own Agent spawns takes a role it declared; a Subagent's own children never do.
export const withDeclaredRole = (
  input: SubagentRouting,
  opened: OpenedChildFeed,
): AssociatedChild => ({
  ...opened,
  declaredRole:
    opened.spawned && input.parentId === input.parent.sessionId
      ? input.takeDeclaredRole()
      : undefined,
});
