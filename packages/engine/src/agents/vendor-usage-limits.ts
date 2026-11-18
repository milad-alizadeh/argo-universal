import type { UsageLimit } from '@repo/contracts';
import { z } from 'zod';

// Part of the vendor module (ADR-0004): each Agent's own `_meta` key for its Usage limits, read in one place.

// `claude-agent-acp` puts the Agent SDK's `SDKRateLimitInfo` under this key on `usage_update`.
const rateLimitKey = '_claude/rateLimit';

const millisecondsPerSecond = 1000;

const status = z.enum(['allowed', 'allowed_warning', 'rejected']);

const limitType = z.enum([
  'five_hour',
  'seven_day',
  'seven_day_opus',
  'seven_day_sonnet',
  'seven_day_overage_included',
  'overage',
]);

// Only the fields Argo reads; the SDK sends more and adds fields over time.
const RateLimit = z.object({
  status,
  rateLimitType: limitType,
  // Epoch seconds.
  resetsAt: z.number().positive().optional(),
  utilization: z.number().min(0).optional(),
  overageStatus: status.optional(),
  overageEnabled: z.boolean().optional(),
});

type RateLimit = z.infer<typeof RateLimit>;

// Any ACP update's `_meta`, parsed here: one that is missing or does not parse reads as no Usage limit.
const UpdateMeta = z
  .unknown()
  .pipe(
    z
      .object({ [rateLimitKey]: RateLimit.nullable().catch(null) })
      .catch({ [rateLimitKey]: null }),
  );

export type UpdateMeta = z.input<typeof UpdateMeta>;

const limits: Record<
  z.infer<typeof limitType>,
  Pick<UsageLimit, 'label' | 'window' | 'model'>
> = {
  five_hour: { label: '5-hour limit', window: 'five_hour' },
  seven_day: { label: 'Weekly limit', window: 'week' },
  seven_day_opus: { label: 'Weekly Opus limit', window: 'week', model: 'opus' },
  seven_day_sonnet: {
    label: 'Weekly Sonnet limit',
    window: 'week',
    model: 'sonnet',
  },
  seven_day_overage_included: {
    label: 'Weekly limit with extra usage',
    window: 'week',
  },
  overage: { label: 'Extra usage', window: 'other' },
};

const capacity = (info: RateLimit): UsageLimit['capacity'] =>
  info.status === 'rejected' ? 'exhausted' : 'available';

const measure = (info: RateLimit): UsageLimit['measure'] =>
  info.utilization === undefined
    ? { kind: 'none' }
    : { kind: 'fraction', used: info.utilization };

const resetsAt = (info: RateLimit): Pick<UsageLimit, 'resetsAt'> =>
  info.resetsAt === undefined
    ? {}
    : {
        resetsAt: new Date(info.resetsAt * millisecondsPerSecond).toISOString(),
      };

const overage = (info: RateLimit): Pick<UsageLimit, 'overage'> =>
  info.overageEnabled === undefined
    ? {}
    : {
        overage: {
          allowed: info.overageEnabled && info.overageStatus !== 'rejected',
        },
      };

// One rate-limit event is the verdict on one request, for the one window it names.
const rateLimitReading = (info: RateLimit, observedAt: Date): UsageLimit => ({
  id: info.rateLimitType,
  ...limits[info.rateLimitType],
  capacity: capacity(info),
  measure: measure(info),
  ...resetsAt(info),
  ...overage(info),
  observed: 'admission',
  observedAt: observedAt.toISOString(),
});

// The Usage limits one ACP session update's `_meta` reports, if any.
export const vendorUsageLimits = (
  meta: UpdateMeta,
  observedAt: Date,
): UsageLimit[] => {
  const info = UpdateMeta.parse(meta)[rateLimitKey];

  return info ? [rateLimitReading(info, observedAt)] : [];
};
