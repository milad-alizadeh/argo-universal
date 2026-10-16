import type { AgentLaunch } from '../..';
import { AuthChanges } from '../../auth/auth-changes';
import type { ConnectionAuthentication } from '../../auth/authenticate';
import { awaitAcpOpening } from '../connection/client';
import { AcpConnection } from '../connection/connection';
import {
  createEntry,
  entryAuthentication,
  pendingAuthentication,
  entryInUse,
  isIdleEntryOf,
  type Entry,
} from './resource-entry';
import type {
  AcpOpenInput,
  AcpResourceInput,
  AcpResources,
  AcpSessionLease,
} from './resource-types';

class EngineAcpResources implements AcpResources {
  private readonly entries = new Map<string, Entry>();
  private stopped = false;
  private readonly connections = new Set<Entry>();
  public readonly authChanges = new AuthChanges();
  public constructor(private readonly input: AcpResourceInput) {}
  public async open(input: AcpOpenInput): Promise<AcpSessionLease> {
    if (this.stopped) throw new Error('ACP resources are stopped');
    input.signal?.throwIfAborted();
    const entry = this.entry(input.launch);
    entry.pending += 1;

    try {
      const connection = await awaitAcpOpening(entry.connecting, input.signal);

      return await connection.open(input);
    } finally {
      entry.pending -= 1;
      this.retireIdle(entry);
    }
  }
  public async authentication(
    launch: AgentLaunch,
  ): Promise<ConnectionAuthentication> {
    if (this.stopped) throw new Error('ACP resources are stopped');

    return await (this.findAuthentication(launch.agentId, launch.projectId) ??
      entryAuthentication(this.entry(launch), this.isStopped));
  }
  public findAuthentication(
    agent: string,
    projectId: string,
  ): Promise<ConnectionAuthentication> | undefined {
    const entry =
      pendingAuthentication(this.connections, agent, projectId) ??
      this.entries.get(JSON.stringify([agent, projectId]));

    return entry ? entryAuthentication(entry, this.isStopped) : undefined;
  }
  private readonly isStopped = (): boolean => this.stopped;
  private entry(launch: AgentLaunch): Entry {
    const key = JSON.stringify([launch.agentId, launch.projectId]);
    const entry = this.entries.get(key);

    if (entry) {
      if (entry.version === launch.version) return entry;
      this.retire(key, entry);
    }

    return this.start(key, launch);
  }
  private start(key: string, launch: AgentLaunch): Entry {
    const connection: AcpConnection = new AcpConnection(this.input, {
      forget: () => this.forget(key, connection),
      idle: () => this.connectionIdle(connection),
      authChanges: this.authChanges,
    });

    const connecting = this.connect(key, connection, launch);
    const entry = createEntry(launch, connection, connecting);

    this.entries.set(key, entry);
    this.connections.add(entry);

    return entry;
  }
  private connect(
    key: string,
    connection: AcpConnection,
    launch: AgentLaunch,
  ): Promise<AcpConnection> {
    return connection.start(launch).catch((cause: unknown) => {
      this.forget(key, connection);
      throw cause instanceof Error ? cause : new Error(String(cause));
    });
  }
  private forget(key: string, connection: AcpConnection): void {
    if (this.entries.get(key)?.connection === connection)
      this.entries.delete(key);
    this.stopConnection(connection);
  }
  private stopConnection(connection: AcpConnection): void {
    void connection
      .shutdown()
      .then(() => {
        for (const entry of this.connections)
          if (entry.connection === connection) this.connections.delete(entry);
      })
      .catch(console.error);
  }
  private connectionIdle(connection: AcpConnection): void {
    for (const entry of this.connections)
      if (entry.connection === connection) this.retireIdle(entry);
  }
  private retireIdle(entry: Entry): void {
    if (entry.dropped && !entryInUse(entry))
      this.stopConnection(entry.connection);
  }
  private retire(key: string, entry: Entry): void {
    this.entries.delete(key);
    this.stopConnection(entry.connection);
  }
  public isAgentInUse = (id: string): boolean =>
    [...this.connections].some(
      (entry) => entry.agentId === id && entryInUse(entry),
    );
  public invalidateAgent = (agentId: string): void => {
    for (const [key, entry] of this.entries)
      if (entry.agentId === agentId) this.retire(key, entry);
  };
  public invalidateIdleAgents = (agentId?: string): void => {
    for (const [key, entry] of this.entries)
      if (isIdleEntryOf(entry, agentId)) this.retire(key, entry);
  };
  public dropAgentConnections = (agentId: string): void => {
    for (const [key, entry] of this.entries)
      if (entry.agentId === agentId) {
        this.entries.delete(key);
        entry.dropped = true;
        this.retireIdle(entry);
      }
  };
  public isDirectoryInUse = (directory: string): boolean =>
    [...this.connections].some((entry) => entry.directory === directory);
  public reserveAuthentication = (): (() => void) => () => {};
  public async shutdown(): Promise<void> {
    this.stopped = true;
    const entries = [...this.connections];
    this.connections.clear();
    this.entries.clear();
    await Promise.allSettled(
      entries.map((entry) => entry.connection.shutdown()),
    );
  }
}

export const createAcpResources = (
  input: AcpResourceInput = {},
): AcpResources => new EngineAcpResources(input);
