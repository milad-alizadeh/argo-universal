import type { ContextUsage, Plan, PlanEntry } from '@repo/contracts';
import type { ComposerProps } from '#features/composer';

const planEntries = (plan: Plan | null): PlanEntry[] | undefined =>
  plan?.type === 'items' ? plan.entries : undefined;

const hasContextCounts = ({ used, size }: ContextUsage): boolean =>
  used >= 0 && size > 0;

const availableContext = (
  usage: ContextUsage | undefined,
): ContextUsage | undefined =>
  usage && hasContextCounts(usage) ? usage : undefined;

// The Composer's plan chips and its Context ring; Usage limits wait for a Server source.
export function composerStatus(
  plan: Plan | null,
  usage: ContextUsage | undefined,
): ComposerProps['status'] {
  const entries = planEntries(plan);
  const context = availableContext(usage);
  const shown = entries !== undefined || context !== undefined;

  return shown ? { plan: entries, context } : undefined;
}
