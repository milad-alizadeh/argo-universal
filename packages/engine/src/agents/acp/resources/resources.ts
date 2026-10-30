import type { DeferredAgentLaunch } from '../..';
import { AuthChanges } from '../../auth/auth-changes';
import type { ConnectionAuthentication } from '../../auth/authenticate';
import { awaitAcpOpening } from '../connection/client';
import { AcpConnections } from './resource-connections';
import { entryAuthentication } from './resource-entry';
import { withdrawResolving } from './resource-launch';
import { openResourceSession } from './resource-mcp';
import { bindSessionAccess } from './resource-policy';
import type {
  AcpOpenInput,
  AcpResourceInput,
  AcpResources,
  AcpSessionLease,
} from './resource-types';

class EngineAcpResources implements AcpResources {
  public readonly authChanges = new AuthChanges();
  private readonly connections: AcpConnections;
  public constructor(input: AcpResourceInput) {
    this.connections = new AcpConnections(input, this.authChanges);
  }
  public async open(input: AcpOpenInput): Promise<AcpSessionLease> {
    this.assertOpening(input);
    const entry = this.connections.entry(input.launch, input.sessionId);
    bindSessionAccess(entry, input.signal, () =>
      this.connections.stopConnection(entry.connection),
    );

    try {
      const connection = await awaitAcpOpening(entry.connecting, input.signal);

      return await openResourceSession(connection, input, entry);
    } finally {
      entry.pending -= 1;
      withdrawResolving(entry, input.signal);
      this.connections.retireIdle(entry);
    }
  }
  private assertOpening(input: AcpOpenInput): void {
    if (this.connections.isStopped())
      throw new Error('ACP resources are stopped');
    input.signal?.throwIfAborted();
  }
  public async authentication(
    launch: DeferredAgentLaunch,
  ): Promise<ConnectionAuthentication> {
    if (this.connections.isStopped())
      throw new Error('ACP resources are stopped');

    return await (this.findAuthentication(launch.agentId, launch.projectId) ??
      entryAuthentication(this.connections.entry(launch), this.isStopped));
  }
  public findAuthentication(
    agent: string,
    projectId: string,
  ): Promise<ConnectionAuthentication> | undefined {
    const entry = this.connections.authenticationEntry(agent, projectId);

    return entry ? entryAuthentication(entry, this.isStopped) : undefined;
  }
  private readonly isStopped = (): boolean => this.connections.isStopped();
  public dropAgentConnections = (agentId: string): void =>
    this.connections.dropAgentConnections(agentId);
  public isDirectoryInUse = (directory: string): boolean =>
    this.connections.isDirectoryInUse(directory);
  public shutdown(): Promise<void> {
    return this.connections.shutdown();
  }
}

export const createAcpResources = (
  input: AcpResourceInput = {},
): AcpResources => new EngineAcpResources(input);
