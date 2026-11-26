import type {
  ProjectInfo,
  ProjectsListOutput,
  SessionInfo,
  SessionListOutput,
} from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { activeSessions, agentsList, projectsList } from '@repo/mocks/app';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import {
  createTRPCClient,
  type OperationLink,
  TRPCClientError,
  type TRPCClient,
  type TRPCLink,
} from '@trpc/client';
import { observable, type Observer } from '@trpc/server/observable';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { type JSX, useEffect, useState } from 'react';
import {
  type Connection,
  ConnectionContext,
  type ConnectionState,
  TRPCProvider,
} from '#features/connection';
import { defaultSessionsView } from '#features/sessions';
import { createQueryClient, keepServerLists } from '../../src/query-cache';
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

interface Screen {
  // Shows or hides the list, as leaving it and returning to it do.
  show: (shown: boolean) => void;
  // The preview hands over how it shows or hides the list.
  attach: (show: (shown: boolean) => void) => void;
}

export interface LiveSessionListFixture {
  screen: Screen;
  queryClient: ReturnType<typeof createQueryClient>;
  client: TRPCClient<AppRouter>;
  connection: Connection;
  // How many `session.list` reads reached the Server.
  listReads: () => number;
  // How many `session.list` reads are on their way.
  listFetching: () => number;
  // How many `session.listUpdates` subscriptions started.
  listUpdatesStarted: () => number;
  // Ends the open `session.listUpdates` subscription with an error, as a dropped socket does.
  dropListUpdates: () => void;
  // Holds `agent.list` unanswered until `releaseAgents`, as a slow Server does.
  holdAgents: () => void;
  releaseAgents: () => void;
  // The window regains focus, as the App returns to the foreground.
  returnToForeground: () => void;
  // Moves the Connection to another state, as an outage and its recovery do.
  connect: (state: ConnectionState) => void;
  // The Server registers a Project the App did not ask for, as `project.add` from an Agent's Operation does.
  registerProject: (project: ProjectInfo) => void;
  // The Server lists a new Session and sends it over `session.listUpdates`.
  sendSession: (session: SessionInfo) => void;
}

interface ServerState {
  listReads: number;
  updatesStarted: number;
  updatesWire: Wire | undefined;
  agentsHeld: boolean;
  waitingForAgents: Wire[];
  projects: ProjectsListOutput;
  sessions: SessionListOutput;
}

type Answer = SessionListOutput | ProjectsListOutput | typeof agentsList;

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
          answer(wire, state.sessions);
          break;
        case 'project.list':
          answer(wire, state.projects);
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

// What changes on the Server without the App asking: a Project registered elsewhere, and a Session it lists and sends.
function serverChanges(
  state: ServerState,
): Pick<LiveSessionListFixture, 'registerProject' | 'sendSession'> {
  return {
    registerProject: (project) => {
      state.projects = [...state.projects, project];
    },
    sendSession: (session) => {
      state.sessions = {
        ...state.sessions,
        sessions: [session, ...state.sessions.sessions],
      };
      state.updatesWire?.next({
        result: { type: 'data', data: { type: 'changed', session } },
      });
    },
  };
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
    projects: projectsList,
    sessions: activeSessions,
  };

  const queryClient = createQueryClient();
  const client = createTRPCClient<AppRouter>({ links: [serverLink(state)] });

  // The App's own lists and their 30 s freshness.
  const trpc = createTRPCOptionsProxy<AppRouter>({ client, queryClient });
  keepServerLists(queryClient, trpc);

  let showList: (shown: boolean) => void = noop;

  const screen: Screen = {
    show: (shown) => showList(shown),
    attach: (show) => {
      showList = show;
    },
  };

  return {
    queryClient,
    client,
    screen,
    connection: connectionOf(link),
    listReads: () => state.listReads,
    listFetching: () => queryClient.isFetching(trpc.session.list.pathFilter()),
    listUpdatesStarted: () => state.updatesStarted,
    dropListUpdates: () =>
      state.updatesWire?.error(TRPCClientError.from(new Error('Socket lost'))),
    holdAgents: () => {
      state.agentsHeld = true;
    },
    releaseAgents: () => releaseAgents(state),
    returnToForeground: () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    },
    connect: (next) => {
      link.state = next;

      for (const listener of link.listeners) listener();
    },
    ...serverChanges(state),
  };
}

// Gives the window's focus back to the browser after a story forced it.
export const restoreWindowFocus = (): void =>
  focusManager.setFocused(undefined);

export function LiveSessionListPreview({
  fixture,
}: {
  fixture: LiveSessionListFixture;
}): JSX.Element {
  const [shown, show] = useState(true);

  useEffect(() => {
    fixture.screen.attach(show);
  }, [fixture, show]);

  return (
    <ConnectionContext.Provider value={fixture.connection}>
      <QueryClientProvider client={fixture.queryClient}>
        <TRPCProvider
          trpcClient={fixture.client}
          queryClient={fixture.queryClient}
        >
          {shown ? (
            <LiveSessionList
              query=""
              onQueryChange={noop}
              view={defaultSessionsView}
            />
          ) : null}
        </TRPCProvider>
      </QueryClientProvider>
    </ConnectionContext.Provider>
  );
}
