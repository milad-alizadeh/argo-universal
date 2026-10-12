import type { ContextUsage, Plan, PlanEntry } from '@repo/contracts';
import type { ComposerProps } from '#features/composer';

const planEntries = (plan: Plan | null): PlanEntry[] | undefined =>
  plan?.type === 'items' ? plan.entries : undefined;

const availableContext = (
  usage: ContextUsage | undefined,
): ContextUsage | undefined => (usage && usage.size > 0 ? usage : undefined);
const measuredContext = (
  usage: ContextUsage | undefined,
): ContextUsage | undefined =>
  usage?.scope === undefined ? availableContext(usage) : undefined;

// The Composer's plan chips and its Context ring; Usage limits wait for a Server source.
export function composerStatus(
  plan: Plan | null,
  usage: ContextUsage | undefined,
): ComposerProps['status'] {
  const entries = planEntries(plan);
  const context = measuredContext(usage);
  const shown = entries !== undefined || context !== undefined;
  return shown ? { plan: entries, context } : undefined;
}
