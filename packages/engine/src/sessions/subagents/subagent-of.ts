import type { SessionRecord } from '@repo/contracts';

// A Subagent is a Session the parent's Agent started over ACP; a Session started through an Operation is a Started Session, never one.
export const isSubagentOf =
  (parentId: string) =>
  (child: Pick<SessionRecord, 'parentSessionId'>): boolean =>
    child.parentSessionId === parentId;
