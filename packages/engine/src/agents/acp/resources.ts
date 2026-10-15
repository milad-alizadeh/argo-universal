import type { AgentLaunch } from '..';
import { awaitAcpOpening } from './client';
import { AcpConnection } from './connection';
import { createEntry, entryInUse, type Entry } from './resource-entry';
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
  public constructor(private readonly input: AcpResourceInput) {}
  public async open(input: AcpOpenInput): Promise<AcpSessionLease> {
    if (this.stopped) throw new Error('ACP resources are stopped');
    input.signal?.throwIfAborted();
    const entry = this.entry(input.launch);
    entry.pending += 1;

    try {
      return await this.openConnected(entry, input);
    } finally {
      entry.pending -= 1;
      this.retireIdle(entry);
    }
  }
  private async openConnected(
    entry: Entry,
    input: AcpOpenInput,
  ): Promise<AcpSessionLease> {
    const connection = await awaitAcpOpening(entry.connecting, input.signal);

    return connection.open(input);
  }
  private entry(launch: AgentLaunch): Entry {
    const key = JSON.stringify([launch.agentId, launch.projectId]);
    const entry = this.entries.get(key);

    if (entry) return this.reuse(key, entry, launch);

    return this.start(key, launch);
  }
  private reuse(key: string, entry: Entry, launch: AgentLaunch): Entry {
    if (entry.version === launch.version) return entry;
    this.retire(key, entry);

    return this.start(key, launch);
  }
  private start(key: string, launch: AgentLaunch): Entry {
    const connection = new AcpConnection(
      this.input,
      () => this.forget(key, connection),
      () => this.connectionIdle(connection),
    );

    const entry = createEntry(
      launch,
      connection,
      this.connect(key, connection, launch),
    );

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
