import type { AppRouter } from '@repo/engine/router';
import { activeSessions, agentsList, projectsList } from '@repo/mocks/app';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTRPCClient,
  type OperationLink,
  TRPCClientError,
  type TRPCClient,
  type TRPCLink,
} from '@trpc/client';
import { observable, type Observer } from '@trpc/server/observable';
import type { JSX } from 'react';
import {
  type Connection,
  ConnectionContext,
  type ConnectionState,
  TRPCProvider,
} from '#features/connection';
import { defaultSessionsView } from '#features/sessions';
import { createQueryClient } from '../../src/query-cache';
import { LiveSessionList } from '../../src/screens/sessions/live-session-list';

const noop = (): void => {};

interface Link {
  state: ConnectionState;
  listeners: Set<() => void>;
}

function connectionOf(link: Link): Connection {
  return {
    state: () => link.state,
    subscribe: (listener) => {
      link.listeners.add(listener);

      return () => void link.listeners.delete(listener);
    },
    nextAttempt: () => Promise.resolve(),
    watch: noop,
    foreground: noop,
    retry: noop,
    refuse: noop,
    stop: noop,
  };
}

type Wire = Observer<
  { result: { type: 'data'; data: unknown } | { type: 'started' } },
  TRPCClientError<AppRouter>
>;

export interface LiveSessionListFixture {
  queryClient: ReturnType<typeof createQueryClient>;
  client: TRPCClient<AppRouter>;
  connection: Connection;
  // How many `session.list` reads reached the Server.
  listReads: () => number;
  // How many `session.listUpdates` subscriptions started.
  listUpdatesStarted: () => number;
  // Ends the open `session.listUpdates` subscription with an error, as a dropped socket does.
  dropListUpdates: () => void;
  // Moves the Connection to another state, as an outage and its recovery do.
  connect: (state: ConnectionState) => void;
}

// A Server whose `session.list`, `project.list`, `agent.list` and `session.listUpdates` a fake link answers, and which counts the reads.
export function liveSessionListFixture(): LiveSessionListFixture {
  const queryClient = createQueryClient();
  const link: Link = { state: 'open', listeners: new Set() };
  const reads = { list: 0, updates: 0 };
  let updatesWire: Wire | undefined;

  const answers = new Map<string, () => object>([
    [
      'session.list',
      (): object => {
        reads.list += 1;

        return activeSessions;
      },
    ],
    ['project.list', (): object => projectsList],
    ['agent.list', (): object => agentsList],
  ]);

  const forward: OperationLink<AppRouter> = ({
    op,
  }): ReturnType<OperationLink<AppRouter>> =>
    observable((wire: Wire): void => {
      if (op.path === 'session.listUpdates') {
        reads.updates += 1;
        updatesWire = wire;
        wire.next({ result: { type: 'started' } });

        return;
      }

      const answer = answers.get(op.path);

      // Anything else the list reaches stays pending, as a slow Server leaves it.
      if (!answer) return;

      wire.next({ result: { type: 'data', data: answer() } });
      wire.complete();
    });

  const answering: TRPCLink<AppRouter> = () => forward;

  const client = createTRPCClient<AppRouter>({ links: [answering] });

  return {
    queryClient,
    client,
    connection: connectionOf(link),
    listReads: () => reads.list,
    listUpdatesStarted: () => reads.updates,
    dropListUpdates: () =>
      updatesWire?.error(TRPCClientError.from(new Error('Socket lost'))),
    connect: (state) => {
      link.state = state;

      for (const listener of link.listeners) listener();
    },
  };
}

export function LiveSessionListPreview({
  fixture,
}: {
  fixture: LiveSessionListFixture;
}): JSX.Element {
  return (
    <ConnectionContext.Provider value={fixture.connection}>
      <QueryClientProvider client={fixture.queryClient}>
        <TRPCProvider
          trpcClient={fixture.client}
          queryClient={fixture.queryClient}
        >
          <LiveSessionList
            query=""
            onQueryChange={noop}
            view={defaultSessionsView}
          />
        </TRPCProvider>
      </QueryClientProvider>
    </ConnectionContext.Provider>
  );
}
