import type {
  LiveHeader,
  PendingPermission,
  PendingElicitation,
} from '@repo/contracts';

type LiveHeaderFixture = {
  activeTurnId: string | null;
  activeTurnStartedAt: number | null;
  permissionQueue: readonly PendingPermission[];
  elicitationQueue: readonly PendingElicitation[];
  pendingPlanProposal: { planId: string; content: string } | null;
};

export const running: LiveHeaderFixture = {
  activeTurnId: 'turn-1',
  activeTurnStartedAt: 1_000,
  permissionQueue: [],
  elicitationQueue: [],
  pendingPlanProposal: null,
};

export function headerText(header: LiveHeader | null): string | null {
  return header?.text ?? null;
}
