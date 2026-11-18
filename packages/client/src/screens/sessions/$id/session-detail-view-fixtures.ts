import type { ContextUsage } from '@repo/contracts';
import { composerStatus } from '#features/sessions';
import type { SessionDetailViewProps } from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

function contextEstimate(
  scope: NonNullable<ContextUsage['scope']>,
): SessionDetailViewProps {
  const usage = { used: 34_000, size: 200_000, scope };

  return {
    ...idleSession,
    state: 'open',
    composer: { ...idleSession.composer, status: composerStatus(null, usage) },
  };
}

export const lastModelCall = contextEstimate('model-call');

export const openingEstimate = contextEstimate('unverified');
