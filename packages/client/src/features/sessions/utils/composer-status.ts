import type {
  ContextUsage,
  Plan,
  PlanEntry,
  UsageLimit,
} from '@repo/contracts';
import type { ComposerProps } from '#features/composer';
import { usageLimitRows } from './usage-limit-rows';

type ComposerStatusProps = NonNullable<ComposerProps['status']>;

// The Agent's Usage limits, and the minute their resets count down from.
export interface UsageLimitsAt {
  limits: readonly UsageLimit[];
  now: Date;
}

const planEntries = (plan: Plan | null): PlanEntry[] | undefined =>
  plan?.type === 'items' ? plan.entries : undefined;

const availableContext = (
  usage: ContextUsage | undefined,
): ContextUsage | undefined => (usage && usage.size > 0 ? usage : undefined);

const measuredContext = (
  usage: ContextUsage | undefined,
): ContextUsage | undefined =>
  usage?.scope === undefined ? availableContext(usage) : undefined;

const noUsageLimits: UsageLimitsAt = { limits: [], now: new Date(0) };

const shownUsage = ({
  limits: reported,
  now,
}: UsageLimitsAt): ComposerStatusProps['usage'] => {
  const limits = usageLimitRows(reported, now);

  return limits.length > 0 ? { limits } : undefined;
};

const anyShown = (status: ComposerStatusProps): boolean =>
  Object.values(status).some((part) => part !== undefined);

// The Composer's plan chips, its Context ring and its Usage control.
export function composerStatus(
  plan: Plan | null,
  usage: ContextUsage | undefined,
  usageLimits: UsageLimitsAt = noUsageLimits,
): ComposerProps['status'] {
  const status = {
    plan: planEntries(plan),
    context: measuredContext(usage),
    usage: shownUsage(usageLimits),
  };

  return anyShown(status) ? status : undefined;
}
