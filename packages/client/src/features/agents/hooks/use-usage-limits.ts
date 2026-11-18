import type {
  AgentUsageLimits,
  UsageLimit,
  UsageLimitsSubject,
} from '@repo/contracts';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect, useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

// The Agent's latest Usage limits, and the current minute their resets count down from.
export interface UsageLimitsRead {
  limits: readonly UsageLimit[];
  now: Date;
}

const aMinute = 60_000;

// The time now, read again as each minute turns, so "Resets in 2h 14m" changes when the clock does.
function useCurrentMinute(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const untilNextMinute = aMinute - (now.getTime() % aMinute);
    const tick = setTimeout((): void => setNow(new Date()), untilNextMinute);

    return (): void => clearTimeout(tick);
  }, [now]);

  return now;
}

type UsageLimitsInput = UsageLimitsSubject | typeof skipToken;

// The cache key of a skipped read; nothing is ever written under it.
const noSubject: UsageLimitsSubject = { agent: '', projectId: '' };

const keyInput = (input: UsageLimitsInput): UsageLimitsSubject =>
  input === skipToken ? noSubject : input;

// Each change the Server streams replaces the cached Usage limits, on every watching Device.
function useFollowUsageLimits(input: UsageLimitsInput): void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const key = trpc.agents.usageLimits.queryKey(keyInput(input));

  const subscription = useSubscription(
    trpc.agents.usageLimitsChanges.subscriptionOptions(input, {
      onData: (change: AgentUsageLimits): void => {
        cache.setQueryData(key, change);
      },
    }),
  );

  useResubscribeOnReconnect(subscription);
}

const limitsOf = (read: AgentUsageLimits | undefined): UsageLimit[] =>
  read?.limits ?? [];

// The Agent's Usage limits: read once, then followed.
export function useUsageLimits(
  subject: UsageLimitsSubject | undefined,
): UsageLimitsRead {
  const trpc = useTRPC();
  const input = subject ?? skipToken;
  const read = useQuery(trpc.agents.usageLimits.queryOptions(input));

  useFollowUsageLimits(input);

  return { limits: limitsOf(read.data), now: useCurrentMinute() };
}
