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
  connecting,
  connection,
  pending: 0,
});

const isEntryInUse = (entry: Entry): boolean =>
  entry.pending > 0 || entry.connection.inUse;

const isIdleEntryOf = (entry: Entry, agentId: string | undefined): boolean =>
  (agentId ?? entry.agentId) === entry.agentId && !isEntryInUse(entry);

class EngineAcpResources implements AcpResources {
  private readonly entries = new Map<string, Entry>();
  private stopped = false;
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
    if (this.entries.get(key)?.connection === connection)
      this.entries.delete(key);
  }
  private retire(key: string, entry: Entry): void {
    this.entries.delete(key);
    void entry.connecting
      .then((connection) => connection.shutdown())
      .catch((cause: unknown) =>
        console.error(
          'Could not stop invalidated Agent',
          cause instanceof Error ? cause.message : String(cause),
        ),
      );
  }
  public isAgentInUse = (id: string): boolean =>
    [...this.entries.values()].some(
      (entry) => entry.agentId === id && isEntryInUse(entry),
    );
  public invalidateAgent = (agentId: string): void => {
    for (const [key, entry] of this.entries)
      if (entry.agentId === agentId) this.retire(key, entry);
  };
  // Retry and disabling stop idle Agents; Sessions keep the processes they use.
  public invalidateIdleAgents = (agentId?: string): void => {
    for (const [key, entry] of this.entries)
      if (isIdleEntryOf(entry, agentId)) this.retire(key, entry);
  };
  public reserveAuthentication = (): (() => void) => () => {};
  public async shutdown(): Promise<void> {
    this.stopped = true;
    const entries = [...this.entries.values()];
    this.entries.clear();
    await Promise.allSettled(
      entries.map(async (entry) => (await entry.connecting).shutdown()),
    );
  }
}

export const createAcpResources = (
  input: AcpResourceInput = {},
): AcpResources => new EngineAcpResources(input);
