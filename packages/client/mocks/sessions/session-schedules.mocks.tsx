import type { operations } from '@repo/contracts/operations';
import type { AppRouter } from '@repo/engine/router';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTRPCClient,
  type OperationLink,
  type TRPCClient,
  type TRPCLink,
} from '@trpc/client';
import { observable, type Observer } from '@trpc/server/observable';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import type { JSX } from 'react';
import type { z } from 'zod';
import {
  type Connection,
  ConnectionContext,
  TRPCProvider,
} from '#features/connection';
import { useSchedules } from '#features/sessions';
import { createQueryClient } from '../../src/query-cache';

const noop = (): void => {};

const connection: Connection = {
  state: () => 'open',
  subscribe: () => noop,
  nextAttempt: () => Promise.resolve(),
  watch: noop,
  foreground: noop,
  retry: noop,
  refuse: noop,
  stop: noop,
};

type Wire = Observer<
  { result: { type: 'data'; data: unknown } | { type: 'started' } },
  never
>;

type ScheduleList = z.output<
  (typeof operations)['session.listSchedules']['result']
>;

export interface SessionSchedulesFixture {
  queryClient: ReturnType<typeof createQueryClient>;
  client: TRPCClient<AppRouter>;
  // How many `session.listSchedules` reads reached the Server.
  listReads: () => number;
  // The refetch intervals set by the observers of the Session's Schedule list; none means nothing polls it.
  pollIntervals: () => unknown[];
  // How many `session.scheduleUpdates` subscriptions started.
  updatesStarted: () => number;
  // The Server pushes its Schedules, as it does when another Device changes one.
  push: (list: ScheduleList) => void;
}

export const sessionId = 'session-1';

// A repeating follow-up with the given Prompt text.
export const scheduleOf = (id: string, text: string): ScheduleList[number] => ({
  id,
  sessionId,
  prompt: [{ type: 'text', text }],
  intervalSeconds: 3600,
  calendar: null,
  nextAt: 1_800_000_000_000,
  endsAt: null,
  lastQueuedAt: null,
  lastSkippedAt: null,
  paused: false,
  listed: false,
  state: 'active',
});

// A Server that answers `session.listSchedules` and `session.scheduleUpdates` and counts what reaches it.
export function sessionSchedulesFixture(
  initial: ScheduleList,
): SessionSchedulesFixture {
  let reads = 0;
  let started = 0;
  let open: Wire | undefined;

  const forward: OperationLink<AppRouter> = ({
    op,
  }): ReturnType<OperationLink<AppRouter>> =>
    observable((wire: Wire): void => {
      if (op.path === 'session.listSchedules') {
        reads += 1;
        wire.next({ result: { type: 'data', data: initial } });
        wire.complete();
      }

      if (op.path === 'session.scheduleUpdates') {
        started += 1;
        open = wire;
        wire.next({ result: { type: 'started' } });
      }
    });

  const link: TRPCLink<AppRouter> = () => forward;

  const queryClient = createQueryClient();
  const client = createTRPCClient<AppRouter>({ links: [link] });
  const trpc = createTRPCOptionsProxy<AppRouter>({ client, queryClient });

  return {
    queryClient,
    client,
    pollIntervals: () =>
      queryClient
        .getQueryCache()
        .find({ queryKey: trpc.session.listSchedules.queryKey({ sessionId }) })
        ?.observers.map(({ options }) => options.refetchInterval)
        .filter((interval) => interval !== undefined && interval !== false) ??
      [],
    listReads: () => reads,
    updatesStarted: () => started,
    push: (list) => open?.next({ result: { type: 'data', data: list } }),
  };
}

function Schedules(): JSX.Element {
  const { items } = useSchedules(sessionId, true, true);

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.prompt.map((block) => ('text' in block ? block.text : ''))}
        </li>
      ))}
    </ul>
  );
}

export function SessionSchedulesPreview({
  fixture,
}: {
  fixture: SessionSchedulesFixture;
}): JSX.Element {
  return (
    <ConnectionContext.Provider value={connection}>
      <QueryClientProvider client={fixture.queryClient}>
        <TRPCProvider
          trpcClient={fixture.client}
          queryClient={fixture.queryClient}
        >
          <Schedules />
        </TRPCProvider>
      </QueryClientProvider>
    </ConnectionContext.Provider>
  );
}
