import type { ContextUsage, Plan, PlanEntry } from '@repo/contracts';
import type { UsageLimitsRead } from '#features/agents';
import type { ComposerProps } from '#features/composer';
import { usageLimitRows } from './usage-limit-rows';

type ComposerStatusProps = NonNullable<ComposerProps['status']>;

const planEntries = (plan: Plan | null): PlanEntry[] | undefined =>
  plan?.type === 'items' ? plan.entries : undefined;

const hasContextCounts = ({ used, size }: ContextUsage): boolean =>
  used >= 0 && size > 0;

const availableContext = (
  usage: ContextUsage | undefined,
): ContextUsage | undefined =>
  usage && hasContextCounts(usage) ? usage : undefined;

// A caller with no Usage limits to show, such as a story of the Plan or Context.
const noUsageLimits: UsageLimitsRead = { limits: [], now: new Date(0) };

const usageControl = ({
  limits: reported,
  now,
}: UsageLimitsRead): ComposerStatusProps['usage'] => {
  const limits = usageLimitRows(reported, now);

  return limits.length > 0 ? { limits } : undefined;
};

const showsAnyControl = (status: ComposerStatusProps): boolean =>
  Object.values(status).some((part) => part !== undefined);

// The Composer's plan chips, its Context ring and its Usage control.
export function composerStatus(
  plan: Plan | null,
  usage: ContextUsage | undefined,
  usageLimits: UsageLimitsRead = noUsageLimits,
): ComposerProps['status'] {
  const status = {
    plan: planEntries(plan),
    context: availableContext(usage),
    usage: usageControl(usageLimits),
  };

  return showsAnyControl(status) ? status : undefined;
}
