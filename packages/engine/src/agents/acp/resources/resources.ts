import type { DeferredAgentLaunch } from '../..';
import { AuthChanges } from '../../auth/auth-changes';
import type { ConnectionAuthentication } from '../../auth/authenticate';
import { awaitAcpOpening } from '../connection/client';
import { AcpConnection } from '../connection/connection';
import {
  createEntry,
  entryAuthentication,
  pendingAuthentication,
  entryInUse,
  type Entry,
} from './resource-entry';
import { startEntry, withdrawResolving } from './resource-launch';
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
      withdrawResolving(entry, input.signal);
      this.retireIdle(entry);
    }
  }
  public async authentication(
    launch: DeferredAgentLaunch,
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
  // A newer Registry version starts a new connection; Sessions on the older one keep it until they end.
  private entry(launch: DeferredAgentLaunch): Entry {
    const key = JSON.stringify([launch.agentId, launch.projectId]);
    const entry = this.entries.get(key);

    if (entry) {
      if (entry.version === launch.version) return entry;
      this.drop(key, entry);
    }

    return this.start(key, launch);
  }
  private start(key: string, launch: DeferredAgentLaunch): Entry {
    const connection = this.createConnection(key);
    const connecting = Promise.withResolvers<AcpConnection>();
    const entry = createEntry(launch, connection, connecting.promise);
    const forget = (): void => this.forget(key, connection);
    connecting.resolve(
      startEntry(entry, launch, { stopped: this.isStopped, forget }),
    );
    this.entries.set(key, entry);
    this.connections.add(entry);

    return entry;
  }
  private createConnection(key: string): AcpConnection {
    const connection: AcpConnection = new AcpConnection(this.input, {
      forget: () => this.forget(key, connection),
      idle: () => this.connectionIdle(connection),
      authChanges: this.authChanges,
    });

    return connection;
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
  private drop(key: string, entry: Entry): void {
    this.entries.delete(key);
    entry.dropped = true;
    this.retireIdle(entry);
  }
  public dropAgentConnections = (agentId: string): void => {
    for (const [key, entry] of this.entries)
      if (entry.agentId === agentId) this.drop(key, entry);
  };
  public isDirectoryInUse = (directory: string): boolean =>
    [...this.connections].some((entry) => entry.directory === directory);
  public async shutdown(): Promise<void> {
    this.stopped = true;
    const entries = [...this.connections];

    for (const entry of entries) entry.resolving.abort();
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
