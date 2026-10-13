import type { ContextUsage, PlanEntry } from '@repo/contracts';
export const fullPercent = 100;
export const smartZonePercent = 20;
export const maximumPlanStepsHeight = 264;
export interface ComposerStatusProps {
  plan?: PlanEntry[];
  subagents?: ComposerWork;
  shells?: ComposerWork;
  usage?: { limits: UsageLimit[] };
  context?: ComposerContext;
}
export interface ComposerWork {
  count: number;
  running: boolean;
  onPress: () => void;
}
export interface UsageLimit {
  label: string;
  usedPercent: number;
  resets: string;
}
export type ComposerContext = ContextUsage & { onCompact?: () => void };
export function contextZone(percent: number): 'smart' | 'dumb' {
  return percent < smartZonePercent ? 'smart' : 'dumb';
}
export function contextPercent(context: ComposerContext): number {
  return context.size > 0
    ? Math.round((context.used / context.size) * fullPercent)
    : 0;
}
export function completedSteps(entries: PlanEntry[]): number {
  return entries.filter((entry) => entry.status === 'completed').length;
}
export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 0,
  })
    .format(value)
    .toLowerCase();
}

export function withPlanStepKeys(
  entries: PlanEntry[],
): { item: PlanEntry; key: string }[] {
  const occurrences = new Map<string, number>();
  return entries.map((entry) => {
    const occurrence = occurrences.get(entry.content) ?? 0;
    occurrences.set(entry.content, occurrence + 1);
    return { item: entry, key: `${entry.content}#${occurrence}` };
  });
}
