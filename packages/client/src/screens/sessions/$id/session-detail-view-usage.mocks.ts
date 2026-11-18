import type { UsageLimit } from '@repo/contracts';
import { composerStatus } from '#features/sessions';
import { emptySession, idleSession } from './session-detail-view.mocks';

const now = new Date('2026-11-18T10:00:00.000Z');

const reading = (
  limit: Pick<UsageLimit, 'id' | 'label' | 'window' | 'resetsAt'> & {
    used: number;
  },
): UsageLimit => ({
  id: limit.id,
  label: limit.label,
  window: limit.window,
  capacity: 'available',
  measure: { kind: 'fraction', used: limit.used },
  resetsAt: limit.resetsAt,
  observed: 'admission',
  observedAt: now.toISOString(),
});

// The Usage limits an Agent reported, as the Server keeps them: the weekly one first, as it arrived.
const reportedUsageLimits: UsageLimit[] = [
  reading({
    id: 'seven_day',
    label: 'Weekly limit',
    window: 'week',
    resetsAt: '2026-11-21T14:00:00.000Z',
    used: 0.31,
  }),
  reading({
    id: 'monthly_extra_usage',
    label: 'Monthly extra usage',
    window: 'month',
    used: 0.12,
  }),
  reading({
    id: 'five_hour',
    label: '5-hour limit',
    window: 'five_hour',
    resetsAt: '2026-11-18T12:14:00.000Z',
    used: 0.54,
  }),
];

// An idle Session whose Agent reported its Usage limits: the Composer's Usage control beside the Context ring.
export const usageLimitsSession = {
  ...idleSession,
  composer: {
    ...idleSession.composer,
    configuration: emptySession.composer.configuration,
    status: composerStatus(
      null,
      { used: 34_000, size: 200_000 },
      { limits: reportedUsageLimits, now },
    ),
  },
};

const accountWindows = [
  reading({
    id: 'primary',
    label: 'Weekly limit',
    window: 'week',
    resetsAt: '2026-11-21T14:00:00.000Z',
    used: 0.4,
  }),
  reading({
    id: 'secondary',
    label: 'Monthly limit',
    window: 'month',
    used: 0.05,
  }),
];

export const accountUsageSession = {
  ...idleSession,
  composer: {
    ...idleSession.composer,
    status: composerStatus(null, undefined, { limits: accountWindows, now }),
  },
};
