import type { AgentLaunch } from '..';
import { awaitAcpOpening } from './client';
import { AcpConnection } from './connection';
import type {
  AcpOpenInput,
  AcpResourceInput,
  AcpResources,
  AcpSessionLease,
} from './resource-types';

type Entry = {
  agentId: string;
  version: string;
  directory?: string;
  connecting: Promise<AcpConnection>;
  connection: AcpConnection;
  pending: number;
};

const createEntry = (
  launch: AgentLaunch,
  connection: AcpConnection,
  connecting: Promise<AcpConnection>,
): Entry => ({
  agentId: launch.agentId,
  version: launch.version,
  directory: launch.installationDirectory,
  connecting,
  connection,
  pending: 0,
});

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
    const connection = new AcpConnection(this.input, () =>
      this.forget(key, connection),
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
      void connection.shutdown().catch(console.error);
      throw cause instanceof Error ? cause : new Error(String(cause));
    });
  }
  private forget(key: string, connection: AcpConnection): void {
    this.forgetConnection(connection);

    if (this.entries.get(key)?.connection === connection)
      this.entries.delete(key);
  }
  private forgetConnection(connection: AcpConnection): void {
    for (const entry of this.connections)
      if (entry.connection === connection) this.connections.delete(entry);
  }
  private retire(key: string, entry: Entry): void {
    this.entries.delete(key);
    void entry.connecting
      .then((connection) => connection.shutdown())
      .finally(() => this.connections.delete(entry))
      .catch((cause: unknown) =>
        console.error(
          'Could not stop invalidated Agent',
          cause instanceof Error ? cause.message : String(cause),
        ),
      );
  }
  public isAgentInUse = (id: string): boolean =>
    [...this.connections].some(
      (entry) =>
        entry.agentId === id && (entry.pending > 0 || entry.connection.inUse),
    );
  public invalidateAgent = (agentId: string): void => {
    for (const [key, entry] of this.entries)
      if (entry.agentId === agentId) this.retire(key, entry);
  };
  public dropAgentConnections = (agentId: string): void => {
    for (const [key, entry] of this.entries)
      if (entry.agentId === agentId) this.entries.delete(key);
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
      entries.map(async (entry) => (await entry.connecting).shutdown()),
    );
  }
}

export const createAcpResources = (
  input: AcpResourceInput = {},
): AcpResources => new EngineAcpResources(input);
