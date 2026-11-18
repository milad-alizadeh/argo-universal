import type { UsageLimit } from '@repo/contracts';
import { z } from 'zod';

// Part of the vendor module (ADR-0004): the windows Claude's Agent SDK reads from the `anthropic-ratelimit-unified-*` headers.

const millisecondsPerSecond = 1000;

export const rateLimitStatus = z.enum([
  'allowed',
  'allowed_warning',
  'rejected',
]);

// One window: `utilization` is its used share, above 1 when use runs past the cap; `resetsAt` is in epoch seconds.
const UnifiedWindow = z.object({
  utilization: z.number().min(0),
  resetsAt: z.number().positive(),
  // At or past the window's own limit; the verdict's status says whether requests are refused.
  status: rateLimitStatus.optional(),
});

export const UnifiedWindows = z.object({
  five_hour: UnifiedWindow.optional(),
  seven_day: UnifiedWindow.optional(),
  seven_day_overage_included: UnifiedWindow.optional(),
});

type UnifiedWindows = z.infer<typeof UnifiedWindows>;

export type UnifiedWindowType = keyof UnifiedWindows;

type UnifiedWindow = z.infer<typeof UnifiedWindow>;

// What one window says of its limit, before it is named.
export type WindowReading = Pick<
  UsageLimit,
  'capacity' | 'measure' | 'resetsAt'
>;

// The shortest window first.
const windowTypes = UnifiedWindows.keyof().options;

export const isoTime = (epochSeconds: number): string =>
  new Date(epochSeconds * millisecondsPerSecond).toISOString();

export const capacityOf = (
  limitStatus: z.infer<typeof rateLimitStatus> | undefined,
): UsageLimit['capacity'] =>
  limitStatus === 'rejected' ? 'exhausted' : 'available';

// A window's reset, left out when it gave none.
export const windowReset = (
  window: WindowReading | undefined,
): Pick<UsageLimit, 'resetsAt'> =>
  window?.resetsAt === undefined ? {} : { resetsAt: window.resetsAt };

const windowReading = (window: UnifiedWindow): WindowReading => ({
  capacity: capacityOf(window.status),
  measure: { kind: 'fraction', used: window.utilization },
  resetsAt: isoTime(window.resetsAt),
});

const readingOf = (
  windows: UnifiedWindows,
  type: UnifiedWindowType,
): [UnifiedWindowType, WindowReading][] => {
  const window = windows[type];

  return window ? [[type, windowReading(window)]] : [];
};

// Each window the SDK reported, read; the shortest first.
export const unifiedWindowReadings = (
  windows: UnifiedWindows | undefined,
): Map<UnifiedWindowType, WindowReading> =>
  new Map(
    windows ? windowTypes.flatMap((type) => readingOf(windows, type)) : [],
  );
