import type { ContextUsage, PlanEntry } from '@repo/contracts';

export const fullPercent = 100;

export const smartZonePercent = 20;

export const maximumTodoStepsHeight = 264;

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
  resets?: string;
}

export type ComposerContext = ContextUsage & { onCompact?: () => void };

export function contextDescription(context: ComposerContext): string {
  if (context.scope === 'model-call')
    return 'Estimated from the last model call.';

  if (context.scope === 'unverified') return 'Agent-reported estimate.';

  return 'Instructions, tools, files and the conversation the Agent reads for its next reply.';
}

export function contextUsedLabel(context: ComposerContext): string {
  return `${context.scope ? '~' : ''}${compactNumber(context.used)}`;
}

export function contextZone(percent: number): 'smart' | 'dumb' {
  return percent < smartZonePercent ? 'smart' : 'dumb';
}

export function contextPercent(context: ComposerContext): number {
  return context.size > 0
    ? Math.round((context.used / context.size) * fullPercent)
    : 0;
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 0,
  })
    .format(value)
    .toLowerCase();
}
