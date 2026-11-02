import { type AppServerState, serverStateOf } from './app-server';
import type { HeldServer } from './open-server-connections';

export type ServerStates = ReadonlyMap<string, AppServerState>;

type HeldServers = ReadonlyMap<string, HeldServer>;

const statesOf = (connections: HeldServers): ServerStates =>
  new Map(
    [...connections].map(([id, open]) => [
      id,
      serverStateOf(open.connection.state()),
    ]),
  );

// Each Server's own state, read from its own Connection, so one unreachable Server says nothing about the next.
export class ServerStatesStore {
  private states: ServerStates;
  private readonly connections: HeldServers;

  public constructor(connections: HeldServers) {
    this.connections = connections;
    this.states = statesOf(connections);
  }

  public readonly getSnapshot = (): ServerStates => this.states;

  public readonly subscribe = (changed: () => void): (() => void) => {
    const stops = [...this.connections.values()].map((open) =>
      open.connection.subscribe(() => {
        this.states = statesOf(this.connections);
        changed();
      }),
    );

    return () => {
      for (const stop of stops) stop();
    };
  };
}
