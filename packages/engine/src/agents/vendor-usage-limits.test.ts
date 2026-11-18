import { UsageLimit } from '@repo/contracts';
import { expect, it, vi } from 'vitest';
import { vendorUsageLimits } from './vendor';

const observedAt = new Date('2026-11-18T10:00:00.000Z');

const rateLimitKey = '_claude/rateLimit';

// The fields of the Agent SDK's `SDKRateLimitInfo` its adapter forwards, loosely typed so a test can send a wrong one.
type RateLimitInfo = {
  status?: string;
  rateLimitType?: string;
  resetsAt?: number;
  utilization?: number;
  overageStatus?: string;
  overageEnabled?: boolean;
  limitScope?: string;
};

const rejections = {
  report: vi.fn<(detail: string, cause?: unknown) => void>(),
};

const read = (info: RateLimitInfo): UsageLimit[] =>
  vendorUsageLimits({ [rateLimitKey]: info }, observedAt, rejections);

it('reads a warned 5-hour window as a used fraction with its reset', () => {
  const limits = read({
    status: 'allowed_warning',
    rateLimitType: 'five_hour',
    resetsAt: 1_795_000_000,
    utilization: 0.9,
  });

  expect(limits).toEqual([
    {
      id: 'five_hour',
      label: '5-hour limit',
      window: 'five_hour',
      capacity: 'available',
      measure: { kind: 'fraction', used: 0.9 },
      resetsAt: '2026-11-18T11:06:40.000Z',
      observed: 'admission',
      observedAt: '2026-11-18T10:00:00.000Z',
    },
  ]);
  expect(limits.map((limit) => UsageLimit.parse(limit))).toEqual(limits);
});

it.each([
  { type: 'five_hour', label: '5-hour limit', window: 'five_hour' },
  { type: 'seven_day', label: 'Weekly limit', window: 'week' },
  {
    type: 'seven_day_opus',
    label: 'Weekly Opus limit',
    window: 'week',
    model: 'opus',
  },
  {
    type: 'seven_day_sonnet',
    label: 'Weekly Sonnet limit',
    window: 'week',
    model: 'sonnet',
  },
  {
    type: 'seven_day_overage_included',
    label: 'Weekly limit with extra usage',
    window: 'week',
  },
  { type: 'overage', label: 'Extra usage', window: 'other' },
])('names the $type window', ({ type, label, window, model }) => {
  const [limit] = read({
    status: 'allowed',
    rateLimitType: type,
    utilization: 0.1,
  });

  expect(limit).toMatchObject({ id: type, label, window });
  expect(limit?.model).toBe(model);
});

it('reads a rejected window as exhausted, with unknown use and refused overage', () => {
  expect(
    read({
      status: 'rejected',
      rateLimitType: 'seven_day',
      overageEnabled: true,
      overageStatus: 'rejected',
    }),
  ).toEqual([
    expect.objectContaining({
      capacity: 'exhausted',
      measure: { kind: 'none' },
      overage: { allowed: false },
    }),
  ]);
});

it('reads allowed overage and ignores fields added later', () => {
  expect(
    read({
      status: 'allowed',
      rateLimitType: 'seven_day',
      utilization: 0.1,
      overageEnabled: true,
      overageStatus: 'allowed',
      limitScope: 'group_pool',
    }),
  ).toEqual([expect.objectContaining({ overage: { allowed: true } })]);
});

it.each<[string, RateLimitInfo]>([
  ['an unknown window', { status: 'allowed', rateLimitType: 'hourly' }],
  ['an unknown status', { status: 'paused', rateLimitType: 'five_hour' }],
  [
    'a negative use',
    { status: 'allowed', rateLimitType: 'five_hour', utilization: -1 },
  ],
])('rejects and reports %s', (_name, info) => {
  rejections.report.mockClear();

  expect(read(info)).toEqual([]);
  expect(rejections.report).toHaveBeenCalledOnce();
});

it('reads nothing from a verdict on no window, with no unified windows', () => {
  rejections.report.mockClear();

  expect(read({ status: 'allowed', utilization: 0.2 })).toEqual([]);
  expect(rejections.report).not.toHaveBeenCalled();
});

it('reads nothing, and reports nothing, from an update without its key', () => {
  rejections.report.mockClear();

  expect(vendorUsageLimits(undefined, observedAt, rejections)).toEqual([]);
  expect(vendorUsageLimits({ other: 1 }, observedAt, rejections)).toEqual([]);
  expect(rejections.report).not.toHaveBeenCalled();
});
