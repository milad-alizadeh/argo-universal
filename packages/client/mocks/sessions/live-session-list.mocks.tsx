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
  // Holds `agent.list` unanswered until `releaseAgents`, as a slow Server does.
  holdAgents: () => void;
  releaseAgents: () => void;
  // Moves the Connection to another state, as an outage and its recovery do.
  connect: (state: ConnectionState) => void;
}

interface ServerState {
  listReads: number;
  updatesStarted: number;
  updatesWire: Wire | undefined;
  agentsHeld: boolean;
  waitingForAgents: Wire[];
}

type Answer = typeof activeSessions | typeof projectsList | typeof agentsList;

const answer = (wire: Wire, data: Answer): void => {
  wire.next({ result: { type: 'data', data } });
  wire.complete();
};

// The link a Server answers through: `session.list`, `project.list`, `agent.list` and `session.listUpdates`; anything else stays pending, as a slow Server leaves it.
function serverLink(state: ServerState): TRPCLink<AppRouter> {
  const forward: OperationLink<AppRouter> = ({
    op,
  }): ReturnType<OperationLink<AppRouter>> =>
    observable((wire: Wire): void => {
      switch (op.path) {
        case 'session.listUpdates':
          state.updatesStarted += 1;
          state.updatesWire = wire;
          wire.next({ result: { type: 'started' } });
          break;
        case 'session.list':
          state.listReads += 1;
          answer(wire, activeSessions);
          break;
        case 'project.list':
          answer(wire, projectsList);
          break;
        case 'agent.list':
          if (state.agentsHeld) state.waitingForAgents.push(wire);
          else answer(wire, agentsList);
          break;
        default:
      }
    });

  return () => forward;
}

function releaseAgents(state: ServerState): void {
  state.agentsHeld = false;

  for (const wire of state.waitingForAgents.splice(0)) answer(wire, agentsList);
}

// A Server whose answers a fake link gives, counting the reads that reach it.
export function liveSessionListFixture(): LiveSessionListFixture {
  const link: Link = { state: 'open', listeners: new Set() };

  const state: ServerState = {
    listReads: 0,
    updatesStarted: 0,
    updatesWire: undefined,
    agentsHeld: false,
    waitingForAgents: [],
  };

  const queryClient = createQueryClient();

  return {
    queryClient,
    client: createTRPCClient<AppRouter>({ links: [serverLink(state)] }),
    connection: connectionOf(link),
    listReads: () => state.listReads,
    listUpdatesStarted: () => state.updatesStarted,
    dropListUpdates: () =>
      state.updatesWire?.error(TRPCClientError.from(new Error('Socket lost'))),
    holdAgents: () => {
      state.agentsHeld = true;
    },
    releaseAgents: () => releaseAgents(state),
    connect: (next) => {
      link.state = next;

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
