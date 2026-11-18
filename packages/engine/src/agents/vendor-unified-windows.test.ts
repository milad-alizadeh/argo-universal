import { UsageLimit } from '@repo/contracts';
import { expect, it } from 'vitest';
import { capturedClaudeRateLimit } from '#mocks/claude-rate-limit';
import { vendorUsageLimits } from './vendor';

const observedAt = new Date('2026-11-18T10:00:00.000Z');

const weekEnds = 1_795_280_400;

const weekEndsAt = '2026-11-21T17:00:00.000Z';

// The SDK's `SDKRateLimitInfo` as its adapter forwards it, loosely typed so a test can send a wrong one.
type UnifiedWindowInfo = {
  utilization?: number | string;
  resetsAt?: number;
  status?: string;
};

type RateLimitInfo = {
  status?: string;
  rateLimitType?: string;
  resetsAt?: number;
  utilization?: number;
  overageStatus?: string;
  overageDisabledReason?: string;
  isUsingOverage?: boolean;
  unifiedWindows?:
    | string
    | {
        five_hour?: UnifiedWindowInfo;
        seven_day?: UnifiedWindowInfo;
        seven_day_overage_included?: UnifiedWindowInfo;
      };
};

const read = (info: RateLimitInfo): UsageLimit[] =>
  vendorUsageLimits({ '_claude/rateLimit': info }, observedAt);

// Regression: on a Claude subscription the Usage control was empty on every Session, as the used share came only here.
it('reads the used share a Claude subscription reports under its unified windows', () => {
  expect(read(capturedClaudeRateLimit)).toEqual([
    {
      id: 'seven_day',
      label: 'Weekly limit',
      window: 'week',
      capacity: 'available',
      measure: { kind: 'fraction', used: 0.44 },
      resetsAt: weekEndsAt,
      observed: 'admission',
      observedAt: '2026-11-18T10:00:00.000Z',
    },
  ]);
});

it('reads every unified window, beside the one the verdict names', () => {
  const limits = read({
    status: 'allowed',
    rateLimitType: 'five_hour',
    unifiedWindows: {
      five_hour: { utilization: 0.2, resetsAt: 1_795_000_000 },
      seven_day: {
        utilization: 0.5,
        resetsAt: weekEnds,
        status: 'allowed_warning',
      },
      seven_day_overage_included: {
        utilization: 1.2,
        resetsAt: weekEnds,
        status: 'rejected',
      },
    },
  });

  expect(limits).toEqual([
    expect.objectContaining({
      id: 'five_hour',
      capacity: 'available',
      measure: { kind: 'fraction', used: 0.2 },
      observed: 'admission',
    }),
    expect.objectContaining({
      id: 'seven_day',
      capacity: 'available',
      measure: { kind: 'fraction', used: 0.5 },
      resetsAt: weekEndsAt,
      observed: 'snapshot',
    }),
    expect.objectContaining({
      id: 'seven_day_overage_included',
      capacity: 'exhausted',
      measure: { kind: 'fraction', used: 1.2 },
      observed: 'snapshot',
    }),
  ]);
  expect(limits.map((limit) => UsageLimit.parse(limit))).toEqual(limits);
});

it('reads the unified windows when the verdict names no window', () => {
  expect(
    read({
      status: 'allowed',
      unifiedWindows: {
        five_hour: { utilization: 0.3, resetsAt: 1_795_000_000 },
      },
    }),
  ).toEqual([
    expect.objectContaining({
      id: 'five_hour',
      measure: { kind: 'fraction', used: 0.3 },
      observed: 'snapshot',
    }),
  ]);
});

it('keeps the other windows when one does not parse', () => {
  expect(
    read({
      status: 'allowed',
      unifiedWindows: {
        five_hour: { utilization: 'high' },
        seven_day: { utilization: 0.1, resetsAt: weekEnds },
      },
    }),
  ).toEqual([expect.objectContaining({ id: 'seven_day' })]);
});

it('keeps the verdict when its unified windows do not parse', () => {
  expect(
    read({
      status: 'allowed',
      rateLimitType: 'five_hour',
      utilization: 0.4,
      unifiedWindows: 'soon',
    }),
  ).toEqual([
    expect.objectContaining({
      id: 'five_hour',
      measure: { kind: 'fraction', used: 0.4 },
    }),
  ]);
});
