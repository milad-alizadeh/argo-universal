import { toSessionCheckout } from '../apps/server/src/services/sessions/session-record.ts';

// Where the Server puts a new worktree Session, under the recordings' `/repo` Project.
export const worktreeCheckout = (
  sessionId: string,
): { type: 'main' | 'worktree'; path: string; branch: string | null } =>
  toSessionCheckout({
    id: sessionId,
    checkoutPath: `/repo/.argo/worktrees/${sessionId}`,
    checkoutBranch: `argo/${sessionId}`,
  });
