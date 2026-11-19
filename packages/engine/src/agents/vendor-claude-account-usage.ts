import type { UsageLimit } from '@repo/contracts';
import { z } from 'zod';
import {
  ClaudeScope,
  claudeWindowName,
  claudeWindows,
  weeklyModel,
} from './vendor-claude-windows';
import {
  type AccountJson,
  type Amount,
  accountReading,
  calendarReset,
  isoReset,
  usagePercent,
} from './vendor-usage-reading';

const ClaudeWindow = z.object({
  utilization: usagePercent,
  resets_at: isoReset,
});

const ScopedWindow = ClaudeWindow.extend({
  display_name: z.string().trim().min(1),
});

const MeterRow = z.object({
  kind: z.string().min(1),
  group: z.string(),
  percent: usagePercent,
  resets_at: isoReset,
  scope: ClaudeScope,
});

const ClaudeSpend = z.object({
  is_enabled: z.literal(true),
  utilization: usagePercent,
});

const ClaudeLimits = z.looseObject({
  model_scoped: z.array(ScopedWindow.nullable().catch(null)).nullish(),
  limits: z.array(MeterRow.nullable().catch(null)).nullish(),
  extra_usage: ClaudeSpend.nullish().catch(null),
});

const ClaudeUsage = z.object({ rate_limits: ClaudeLimits.nullable() });

type Limits = z.infer<typeof ClaudeLimits>;

function toAmount(window: z.infer<typeof ClaudeWindow>): Amount {
  return {
    used: window.utilization,
    resetsAt: calendarReset(window.resets_at),
  };
}

function namedWindows(limits: Limits, observedAt: string): UsageLimit[] {
  return Object.values(claudeWindows).flatMap((name) => {
    const window = ClaudeWindow.safeParse(limits[name.id]).data;

    return window ? [accountReading(name, toAmount(window), observedAt)] : [];
  });
}

function scopedWindows(limits: Limits, observedAt: string): UsageLimit[] {
  return (limits.model_scoped ?? [])
    .filter((row) => row !== null)
    .map((row) =>
      accountReading(weeklyModel(row.display_name), toAmount(row), observedAt),
    );
}

function reportedWindows(limits: Limits, observedAt: string): UsageLimit[] {
  return (limits.limits ?? [])
    .filter((row) => row !== null)
    .map((row) => {
      const name = claudeWindowName(row.group, row.kind, row.scope);

      const amount = {
        used: row.percent,
        resetsAt: calendarReset(row.resets_at),
      };

      return accountReading(name, amount, observedAt);
    });
}

const monthlySpend = {
  id: 'monthly_extra_usage',
  label: 'Monthly extra usage',
  window: 'month',
} as const;

function spendWindow(limits: Limits, observedAt: string): UsageLimit[] {
  const spend = limits.extra_usage;

  if (!spend) return [];
  const amount = { used: spend.utilization, resetsAt: undefined };

  return [accountReading(monthlySpend, amount, observedAt)];
}

export function claudeAccountUsage(
  response: AccountJson,
  observedAt: string,
): UsageLimit[] | undefined {
  const parsed = ClaudeUsage.safeParse(response);

  if (!parsed.success) return;
  const limits = parsed.data.rate_limits;

  return limits ? collectWindows(limits, observedAt) : [];
}

function collectWindows(limits: Limits, observedAt: string): UsageLimit[] {
  const reported = [
    ...namedWindows(limits, observedAt),
    ...scopedWindows(limits, observedAt),
    ...reportedWindows(limits, observedAt),
    ...spendWindow(limits, observedAt),
  ];

  return [...new Map(reported.map((limit) => [limit.label, limit])).values()];
}
