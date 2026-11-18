import type { ContextUsage } from '@repo/contracts';
import { composerStatus } from '#features/sessions';
import type { OpenSessionViewProps } from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

function contextEstimate(
  scope: NonNullable<ContextUsage['scope']>,
): OpenSessionViewProps['composer'] {
  const usage = { used: 34_000, size: 200_000, scope };

  return { ...idleSession.composer, status: composerStatus(null, usage) };
}

export const estimateSources = {
  'Last model call': contextEstimate('model-call'),
  'Opening report': contextEstimate('unverified'),
};

export const estimatedContext = {
  ...idleSession,
  state: 'open',
  composer: estimateSources['Last model call'],
} as const;
