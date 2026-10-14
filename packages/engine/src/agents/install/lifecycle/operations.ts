import type {
  AgentInstallInput,
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import { defaultInstallPorts } from '../default-ports';
import type { InstallPorts } from '../ports';
import { readInstallationStatus } from '../selection/status';
import { recheckIfFailed } from './cancelled-check';
import { ConfigurationReservations } from './configuration-reservations';
import {
  abortInstallation,
  inUseOperation,
  startOperation,
  createOwnedInstall,
} from './operation-results';
import type { InstallBindings, OwnedInstall } from './operation-types';
import { createInstallationReadiness } from './readiness';
import { removeAgentInstallation } from './removal';
import { settleAgentInstallation } from './settlement';

const inUse = 'Agent is in use. Close its Sessions and finish setup first.';

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
    return this.active.has(agentId) || this.configuration.hasExclusive(agentId);
  }
  private isReserved(agentId: string): boolean {
    return this.active.has(agentId) || this.configuration.has(agentId);
  }
  public configure<Result>(
    agentId: string,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    return this.configuration.afterCheck(agentId, () => {
      if (this.stopped) throw new Error('Engine is stopping');

      if (this.isReserved(agentId)) throw new Error('Agent is in use by setup');

      return this.configuration.run(agentId, operation);
    });
  }
  public check = createInstallationReadiness({
    configuration: this.configuration,
    installation: (agentId) => this.active.get(agentId)?.settled,
    isStopped: () => this.stopped,
  });
  // A Readiness check is not a use: a change to the launch stops it instead.
  private isInUse(agentId: string): boolean {
    return this.isBusy(agentId) || this.dependencies().isInUse(agentId);
  }
  public async mutateLaunch<Result>(
    agentId: string,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    if (this.isInUse(agentId)) throw new Error(inUse);

    return recheckIfFailed(
      await this.configuration.cancelCheck(agentId),
      () => this.configure(agentId, operation),
      () => this.dependencies().afterInstall(agentId),
    );
  }
  public async remove(agentId: string): Promise<void> {
    await this.mutateLaunch(agentId, async () => {
      await removeAgentInstallation({
        home: this.home,
        deps: this.dependencies(),
        agentId,
      });
      this.completed.delete(agentId);
    });
    this.dependencies().afterRemove?.();
  }
  private own(operation: AgentInstallOperation): void {
    const checking = this.configuration.cancelCheck(operation.agentId);
    const owned = createOwnedInstall(operation);
    this.active.set(operation.agentId, owned);
    owned.settled = this.run(owned, checking);
    void owned.settled.catch(() => {});
  }
  public start(input: AgentInstallInput): AgentInstallOperation {
    if (this.stopped) throw new Error('Engine is stopping');
    const operation = startOperation(input);

    if (this.isInUse(input.agentId)) return inUseOperation(operation);
    this.own(operation);

    return operation;
  }
  private async run(
    owned: OwnedInstall,
    checking: Promise<boolean>,
  ): Promise<void> {
    try {
      const completed = await settleAgentInstallation(
        { home: this.home, ports: this.ports, deps: this.dependencies() },
        owned,
        checking,
      );

      this.completed.set(owned.operation.agentId, completed);
    } finally {
      if (owned.released) this.active.delete(owned.operation.agentId);
    }
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
