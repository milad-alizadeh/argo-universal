import type { UsageLimit } from '@repo/contracts';
import { z } from 'zod';
import {
  isoTime,
  rateLimitStatus,
  UnifiedWindows,
  unifiedWindowReadings,
  type WindowReading,
} from './vendor-unified-windows';

// Part of the vendor module (ADR-0004): each Agent's own `_meta` key for its Usage limits, read in one place.

// `claude-agent-acp` puts the Agent SDK's `SDKRateLimitInfo` under this key on `usage_update`.
const rateLimitKey = '_claude/rateLimit';

const limitType = z.enum([
  'five_hour',
  'seven_day',
  'seven_day_opus',
  'seven_day_sonnet',
  'seven_day_overage_included',
  'overage',
]);

type LimitType = z.infer<typeof limitType>;

// Only the fields Argo reads; the SDK sends more and adds fields over time.
const RateLimit = z.object({
  status: rateLimitStatus,
  // The window this verdict is on, when it names one.
  rateLimitType: limitType.optional(),
  // Epoch seconds.
  resetsAt: z.number().positive().optional(),
  // A subscription leaves this out and reports its used share under `unifiedWindows`.
  utilization: z.number().min(0).optional(),
  overageStatus: rateLimitStatus.optional(),
  overageEnabled: z.boolean().optional(),
  unifiedWindows: UnifiedWindows.nullish().catch(null),
});

type RateLimit = z.infer<typeof RateLimit>;

type Verdict = RateLimit & { rateLimitType: LimitType };

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
  LimitType,
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

type Observation = Pick<UsageLimit, 'observed' | 'observedAt'>;

const named = (
  type: LimitType,
  reading: WindowReading,
  observation: Observation,
): UsageLimit => ({ id: type, ...limits[type], ...reading, ...observation });

const windowMeasure = (
  window: WindowReading | undefined,
): UsageLimit['measure'] => window?.measure ?? { kind: 'none' };

const measure = (
  info: RateLimit,
  window: WindowReading | undefined,
): UsageLimit['measure'] =>
  info.utilization === undefined
    ? windowMeasure(window)
    : { kind: 'fraction', used: info.utilization };

const resetsAt = (
  info: RateLimit,
  window: WindowReading | undefined,
): Pick<UsageLimit, 'resetsAt'> =>
  info.resetsAt === undefined
    ? { resetsAt: window?.resetsAt }
    : { resetsAt: isoTime(info.resetsAt) };

const overage = (info: RateLimit): Pick<UsageLimit, 'overage'> =>
  info.overageEnabled === undefined
    ? {}
    : {
        overage: {
          allowed: info.overageEnabled && info.overageStatus !== 'rejected',
        },
      };

const verdictWindow = (
  info: RateLimit,
  window: WindowReading | undefined,
): WindowReading => ({
  capacity: info.status === 'rejected' ? 'exhausted' : 'available',
  measure: measure(info, window),
  ...resetsAt(info, window),
});

// The verdict on one request for the window it names: its own numbers win, and that window's reading fills the rest.
const verdictReading = (
  info: Verdict,
  window: WindowReading | undefined,
  observedAt: string,
): UsageLimit => ({
  ...named(info.rateLimitType, verdictWindow(info, window), {
    observed: 'admission',
    observedAt,
  }),
  ...overage(info),
});

const hasWindow = (info: RateLimit): info is Verdict =>
  info.rateLimitType !== undefined;

const verdictOf = (
  info: RateLimit,
  windows: Map<LimitType, WindowReading>,
  observedAt: string,
): UsageLimit[] =>
  hasWindow(info)
    ? [verdictReading(info, windows.get(info.rateLimitType), observedAt)]
    : [];

// The verdict's window first, then every other window the SDK read: those are readings of the plan.
const rateLimitReadings = (
  info: RateLimit,
  observedAt: string,
): UsageLimit[] => {
  const windows: Map<LimitType, WindowReading> = unifiedWindowReadings(
    info.unifiedWindows,
  );

  const others = windows
    .entries()
    .filter(([type]) => type !== info.rateLimitType)
    .map(([type, reading]) =>
      named(type, reading, { observed: 'snapshot', observedAt }),
    );

  return [...verdictOf(info, windows, observedAt), ...others];
};

// The Usage limits one ACP session update's `_meta` reports, if any.
export const vendorUsageLimits = (
  meta: UpdateMeta,
  observedAt: Date,
): UsageLimit[] => {
  const info = UpdateMeta.parse(meta)[rateLimitKey];

  return info ? rateLimitReadings(info, observedAt.toISOString()) : [];
};
