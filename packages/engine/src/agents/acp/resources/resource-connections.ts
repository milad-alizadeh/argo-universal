import type { DeferredAgentLaunch } from '../..';
import type { AuthChanges } from '../../auth/auth-changes';
import { AcpConnection } from '../connection/connection';
import {
  createEntry,
  pendingAuthentication,
  type Entry,
} from './resource-entry';
import { startEntry } from './resource-launch';
import {
  launchPolicy,
  sessionResourceKey,
  forgetConnection,
  canRetire,
  stopResolving,
} from './resource-policy';
import type { AcpResourceInput } from './resource-types';

export class AcpConnections {
  private readonly entries = new Map<string, Entry>();
  private readonly connections = new Set<Entry>();
  public stopped = false;
  public constructor(
    private readonly input: AcpResourceInput,
    private readonly authChanges: AuthChanges,
  ) {}
  public authenticationEntry(
    agent: string,
    projectId: string,
  ): Entry | undefined {
    return (
      pendingAuthentication(this.connections, agent, projectId) ??
      this.entries.get(JSON.stringify([agent, projectId]))
    );
  }
  private readonly isStopped = (): boolean => this.stopped;
  // A newer Registry version starts a new connection; Sessions on the older one keep it until they end.
  public entry(launch: DeferredAgentLaunch, sessionId?: string): Entry {
    const own = this.entries.get(sessionResourceKey(launch, sessionId));

    if (own && own.version === launch.version) return own;

    return this.policyEntry(
      launch,
      launchPolicy(this.input, launch, sessionId),
    );
  }
  private policyEntry(
    launch: DeferredAgentLaunch,
    policy: ReturnType<typeof launchPolicy>,
  ): Entry {
    const entry = this.entries.get(policy.key);

    if (entry) {
      if (entry.version === launch.version) return entry;
      this.drop(policy.key, entry);
    }

    return this.start(policy.key, launch, policy.access);
  }
  private start(
    key: string,
    launch: DeferredAgentLaunch,
    access?: Entry['access'],
  ): Entry {
    const connecting = Promise.withResolvers<AcpConnection>();

    const entry = createEntry(launch, this.createConnection(key), {
      connecting: connecting.promise,
      access,
    });

    connecting.resolve(this.connecting(entry, launch, key));
    this.entries.set(key, entry);
    this.connections.add(entry);

    return entry;
  }
  private connecting(
    entry: Entry,
    launch: DeferredAgentLaunch,
    key: string,
  ): Promise<AcpConnection> {
    return startEntry(entry, launch, {
      stopped: this.isStopped,
      forget: () => this.forget(key, entry.connection),
    });
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
  public stopConnection(connection: AcpConnection): void {
    forgetConnection(this.entries, this.connections, connection);
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
  public retireIdle(entry: Entry): void {
    if (canRetire(entry)) this.stopConnection(entry.connection);
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

    for (const entry of entries) stopResolving(entry);

    this.connections.clear();
    this.entries.clear();
    await Promise.allSettled(
      entries.map((entry) => entry.connection.shutdown()),
    );
  }
}
