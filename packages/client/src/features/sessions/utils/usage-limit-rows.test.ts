import type { UsageLimit } from '@repo/contracts';
import { expect, it } from 'vitest';
import { composerStatus } from './composer-status';
import { usageLimitRows } from './usage-limit-rows';

const fiveHourLabel = '5-hour limit';

const fiveHourResets = 'Resets in 2h 14m';

const now = new Date('2026-11-18T10:00:00.000Z');

const minutesFromNow = (minutes: number): string =>
  new Date(now.getTime() + minutes * 60_000).toISOString();

const limit = (overrides: Partial<UsageLimit>): UsageLimit => ({
  id: 'five_hour',
  label: fiveHourLabel,
  window: 'five_hour',
  capacity: 'available',
  measure: { kind: 'fraction', used: 0.54 },
  resetsAt: minutesFromNow(134),
  observed: 'admission',
  observedAt: now.toISOString(),
  ...overrides,
});

it('draws a fraction as a rounded percent with the time to its reset', () => {
  expect(usageLimitRows([limit({})], now)).toEqual([
    { label: fiveHourLabel, usedPercent: 54, resets: fiveHourResets },
  ]);
});

it('draws a budget as its used share of the entitlement', () => {
  const budget = limit({
    measure: { kind: 'budget', used: 75, entitled: 300, unit: 'requests' },
  });

  expect(usageLimitRows([budget], now)).toEqual([
    expect.objectContaining({ usedPercent: 25 }),
  ]);
});

it.each([
  { used: 1.4, percent: 100 },
  { used: 0.004, percent: 0 },
])('keeps $used within the meter as $percent%', ({ used, percent }) => {
  const [row] = usageLimitRows(
    [limit({ measure: { kind: 'fraction', used } })],
    now,
  );

  expect(row?.usedPercent).toBe(percent);
});

it.each([
  { minutes: 0.5, text: 'Resets in less than a minute' },
  { minutes: 45, text: 'Resets in 45m' },
  { minutes: 120, text: 'Resets in 2h' },
  { minutes: 134, text: fiveHourResets },
  { minutes: 1440, text: 'Resets in 1d' },
  { minutes: 4560, text: 'Resets in 3d 4h' },
])('says $text', ({ minutes, text }) => {
  const [row] = usageLimitRows(
    [limit({ resetsAt: minutesFromNow(minutes) })],
    now,
  );

  expect(row?.resets).toBe(text);
});

it.each([
  [
    'a balance',
    { measure: { kind: 'balance', available: 4, unit: 'credits' } },
  ],
  ['an unknown use', { measure: { kind: 'none' } }],
  [
    'an empty budget',
    { measure: { kind: 'budget', used: 0, entitled: 0, unit: 'credits' } },
  ],
  ['no reset', { resetsAt: undefined }],
  ['a reset that passed', { resetsAt: minutesFromNow(-1) }],
] satisfies [string, Partial<UsageLimit>][])(
  'leaves out %s, which waits for a design',
  (_case, overrides) => {
    expect(usageLimitRows([limit(overrides)], now)).toEqual([]);
  },
);

it('puts the shortest window first and a model limit after the plan limit', () => {
  const rows = usageLimitRows(
    [
      limit({
        id: 'opus',
        label: 'Weekly Opus limit',
        window: 'week',
        model: 'opus',
      }),
      limit({ id: 'week', label: 'Weekly limit', window: 'week' }),
      limit({ id: 'other', label: 'Extra usage', window: 'other' }),
      limit({}),
    ],
    now,
  );

  expect(rows.map((row) => row.label)).toEqual([
    fiveHourLabel,
    'Weekly limit',
    'Weekly Opus limit',
    'Extra usage',
  ]);
});

it('gives the Composer a Usage control only when a limit is shown', () => {
  expect(composerStatus(null, undefined, { limits: [limit({})], now })).toEqual(
    {
      plan: undefined,
      context: undefined,
      usage: {
        limits: [
          { label: fiveHourLabel, usedPercent: 54, resets: fiveHourResets },
        ],
      },
    },
  );
  expect(
    composerStatus(null, undefined, {
      limits: [limit({ measure: { kind: 'none' } })],
      now,
    }),
  ).toBeUndefined();
});
