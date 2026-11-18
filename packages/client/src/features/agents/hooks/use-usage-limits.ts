import type { AgentUsageLimits, UsageLimit } from '@repo/contracts';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect, useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

// The Agent and Project a sign-in, and so its Usage limits, belong to.
export interface UsageLimitsSubject {
  agent: string;
  projectId: string;
}

// The Agent's latest Usage limits, and the minute they are read against, so a reset counts down.
export interface UsageLimitsRead {
  limits: UsageLimit[];
  now: Date;
}

const aMinute = 60_000;

function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval((): void => setNow(new Date()), aMinute);

    return (): void => clearInterval(tick);
  }, []);

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

  return { limits: limitsOf(read.data), now: useMinute() };
}
