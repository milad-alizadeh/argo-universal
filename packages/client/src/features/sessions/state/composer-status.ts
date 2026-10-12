import type { ContextUsage, Plan, PlanEntry } from '@repo/contracts';
import type { ComposerProps } from '#features/composer';

const planEntries = (plan: Plan | null): PlanEntry[] | undefined =>
  plan?.type === 'items' ? plan.entries : undefined;

// The Composer's plan chips and its Context ring; Usage limits wait for a Server source.
export function composerStatus(
  plan: Plan | null,
  usage: ContextUsage | undefined,
): ComposerProps['status'] {
  const entries = planEntries(plan);
  const shown = entries !== undefined || usage !== undefined;
  return shown ? { plan: entries, context: usage } : undefined;
}
