import type {
  AgentInstallInput,
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import { ConfigurationReservations } from './configuration-reservations';
import { defaultInstallPorts } from './default-ports';
import { executeAgentInstall } from './execution';
import {
  abortInstallation,
  failedOperation,
  installedOperation,
  inUseOperation,
  installationDeadline,
  startOperation,
} from './operation-results';
import type { InstallBindings, OwnedInstall } from './operation-types';
import type { InstallPorts } from './ports';
import { InstallCleanupError } from './process';
import { readInstallationStatus } from './status';
export class AgentInstallations {
  private bindings: InstallBindings | undefined;
  private readonly active = new Map<string, OwnedInstall>();
  private readonly completed = new Map<string, AgentInstallOperation>();
  private stopped = false;
  private readonly configuration = new ConfigurationReservations();
  public constructor(
    private readonly home: string,
    private readonly ports: InstallPorts = defaultInstallPorts,
  ) {}
  public bind(bindings: InstallBindings): void {
    this.bindings = bindings;
  }
  private dependencies(): InstallBindings {
    if (!this.bindings)
      throw new Error('Agent installation is not initialized');
    return this.bindings;
  }
  public isBusy(agentId: string): boolean {
    return this.active.has(agentId) || this.configuration.has(agentId);
  }
  public configure<Result>(
    agentId: string,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    if (this.stopped) throw new Error('Engine is stopping');
    if (this.isBusy(agentId)) throw new Error('Agent is in use by setup');
    return this.configuration.run(agentId, operation);
  }
  private isInUse(agentId: string): boolean {
    return this.isBusy(agentId) || this.dependencies().isInUse(agentId);
  }
  private own(operation: AgentInstallOperation): void {
    const owned: OwnedInstall = {
      operation,
      controller: new AbortController(),
      settled: Promise.resolve(),
      released: true,
    };
    this.active.set(operation.agentId, owned);
    owned.settled = this.run(owned);
    void owned.settled.catch(() => {});
  }
  public start(input: AgentInstallInput): AgentInstallOperation {
    if (this.stopped) throw new Error('Engine is stopping');
    const operation = startOperation(input);
    if (this.isInUse(input.agentId)) return inUseOperation(operation);
    this.own(operation);
    return operation;
  }
  private execute(owned: OwnedInstall): Promise<void> {
    return executeAgentInstall({
      home: this.home,
      ports: this.ports,
      deps: this.dependencies(),
      signal: owned.controller.signal,
      operation: owned.operation,
    });
  }
  private async run(owned: OwnedInstall): Promise<void> {
    const timeout = installationDeadline(owned.controller);
    try {
      await this.execute(owned);
      this.complete(owned);
    } catch (error) {
      this.rememberFailure(owned, error);
    } finally {
      clearTimeout(timeout);
      this.release(owned);
    }
  }
  private complete(owned: OwnedInstall): void {
    this.completed.set(owned.operation.agentId, installedOperation(owned));
  }
  private release(owned: OwnedInstall): void {
    if (owned.released) this.active.delete(owned.operation.agentId);
  }
  private rememberFailure(owned: OwnedInstall, error: unknown): void {
    if (error instanceof InstallCleanupError)
      return this.retainCleanup(owned, error);
    this.completed.set(owned.operation.agentId, failedOperation(owned, error));
  }
  private retainCleanup(
    owned: OwnedInstall,
    error: InstallCleanupError,
  ): never {
    owned.released = false;
    owned.operation = {
      ...owned.operation,
      status: 'failed',
      failure: error.message,
    };
    throw error;
  }
  private operationFor(agentId: string): AgentInstallOperation | null {
    const owned = this.active.get(agentId);
    if (owned) return owned.operation;
    return this.completed.get(agentId) ?? null;
  }
  public async status(agentId: string): Promise<AgentInstallStatus> {
    return {
      installation: await readInstallationStatus(
        this.home,
        this.dependencies().database,
        agentId,
      ),
      operation: this.operationFor(agentId),
    };
  }
  public async cancel(input: {
    agentId: string;
    operationId: string;
  }): Promise<void> {
    const owned = this.active.get(input.agentId);
    if (!owned || owned.operation.operationId !== input.operationId)
      throw new Error('Installation is no longer active');
    abortInstallation(owned, 'Installation cancelled');
    await owned.settled;
  }
  public async shutdown(): Promise<void> {
    this.stopped = true;
    const owned = [...this.active.values()];
    for (const operation of owned)
      abortInstallation(operation, 'Engine stopped');
    await Promise.all([
      this.configuration.wait(),
      ...owned.map((operation) => operation.settled),
    ]);
  }
}
