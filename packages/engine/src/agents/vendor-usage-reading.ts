import type { UsageLimit } from '@repo/contracts';
import { z } from 'zod';

export type AccountJson = z.infer<ReturnType<typeof z.json>>;

export type LimitName = Pick<UsageLimit, 'id' | 'label' | 'model' | 'window'>;

export const fullPercent = 100;

export const usagePercent = z.number().min(0);

export const isoReset = z.iso.datetime({ offset: true }).nullish().catch(null);

export const epochReset = z.number().positive().nullish().catch(null);

export type Reset = string | null | undefined;

function resetAt(date: Date): Reset {
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export const calendarReset = (value: Reset): Reset =>
  value ? resetAt(new Date(value)) : undefined;

const millisecondsPerSecond = 1000;

export const secondsReset = (seconds: number | null | undefined): Reset =>
  seconds ? resetAt(new Date(seconds * millisecondsPerSecond)) : undefined;

export type Amount = { used: number; resetsAt: Reset };

export const accountReading = (
  name: LimitName,
  { used, resetsAt }: Amount,
  observedAt: string,
): UsageLimit => {
  const limit: UsageLimit = {
    ...name,
    measure: { kind: 'fraction', used: used / fullPercent },
    capacity: used >= fullPercent ? 'exhausted' : 'available',
    observed: 'snapshot',
    observedAt,
  };

  if (resetsAt) limit.resetsAt = resetsAt;

  return limit;
};
