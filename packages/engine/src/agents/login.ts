import type {
  AgentLoginTerminalRead,
  AgentLoginTerminalWrite,
  AgentLoginTerminalFrame,
  AgentLoginAnswer,
  AgentLoginChoose,
  AgentLoginOperation,
  AgentLoginSnapshot,
  AgentLoginStart,
} from '@repo/contracts';
import { evictFinishedLogins } from './login-eviction';
import { LoginOperation } from './login-operation';
import type { LoginOperationDeps } from './login-resources';

export type AgentLoginsDeps = Omit<
  LoginOperationDeps,
  'timeoutMs' | 'cleanupTimeoutMs'
> & {
  createId: () => string;
  isAgentSetupBusy?: (agentId: string) => boolean;
  timeoutMs?: number;
  cleanupTimeoutMs?: number;
};

const operationLimit = 64;

const loginTimeout = 300_000;

const cleanupTimeout = 15_000;

export class AgentLogins {
  private readonly operations = new Map<string, LoginOperation>();
  private readonly latest = new Map<string, string>();
  private readonly mutations = new Map<string, Promise<unknown>>();
  private stopping = false;
  private readonly finished = new Set<(agentId: string) => void>();
  public constructor(private readonly deps: AgentLoginsDeps) {}
  // Called once a sign-in has finished and released its process, whatever its outcome.
  public afterLogin(listener: (agentId: string) => void): void {
    this.finished.add(listener);
  }
  public start(input: AgentLoginStart): AgentLoginSnapshot {
    if (this.stopping) throw new Error('Engine is shutting down');
    this.requireNoMutation(input.agentId);

    if (this.deps.isAgentSetupBusy?.(input.agentId))
      throw new Error('Agent is in use by setup');
    const previous = this.current(input.agentId);

    if (previous?.blocksMutation()) return previous.snapshot(input.ownerToken);
    evictFinishedLogins(this.operations, this.latest, operationLimit);

    if (this.operations.size >= operationLimit)
      throw new Error('Too many Agent login operations');

    return this.create(input);
  }
  private create(input: AgentLoginStart): AgentLoginSnapshot {
    const operationId = this.deps.createId();

    const operation = new LoginOperation(
      { ...input, operationId },
      {
        ...this.deps,
        timeoutMs: this.deps.timeoutMs ?? loginTimeout,
        cleanupTimeoutMs: this.deps.cleanupTimeoutMs ?? cleanupTimeout,
      },
    );

    void operation.finished.then(() => this.notifyFinished(input.agentId));
    this.operations.set(operationId, operation);
    this.latest.set(input.agentId, operationId);

    return operation.snapshot(input.ownerToken);
  }
  public read(input: AgentLoginOperation): AgentLoginSnapshot {
    return this.requireOperation(input.operationId).snapshot(input.ownerToken);
  }
  public choose(input: AgentLoginChoose): AgentLoginSnapshot {
    const operation = this.requireOwner(input);
    operation.choose(input.methodId);

    return operation.snapshot(input.ownerToken);
  }
  public answer(input: AgentLoginAnswer): AgentLoginSnapshot {
    const operation = this.requireOwner(input);
    operation.respond(input);

    return operation.snapshot(input.ownerToken);
  }
  public readTerminal(input: AgentLoginTerminalRead): AgentLoginTerminalFrame {
    return this.requireOwner(input).readTerminal(input.cursor);
  }
  public inputTerminal(input: AgentLoginTerminalWrite): void {
    this.requireOwner(input).inputTerminal(input.input);
  }
  public cancel(input: AgentLoginOperation): AgentLoginSnapshot {
    const operation = this.requireOwner(input);
    operation.cancel();

    return operation.snapshot(input.ownerToken);
  }
  public isBusy(agentId: string): boolean {
    return (
      this.mutations.has(agentId) || !!this.current(agentId)?.blocksMutation()
    );
  }
  public requireMutable(agentId: string): void {
    if (this.stopping) throw new Error('Engine is shutting down');
    this.requireNoMutation(agentId);

    if (this.current(agentId)?.blocksMutation())
      throw new Error('Agent login is in progress or cleanup failed');
  }
  public async runMutation<T>(
    agentId: string,
    mutation: () => Promise<T>,
  ): Promise<T> {
    this.requireMutable(agentId);
    const pending = Promise.resolve().then(mutation);
    this.mutations.set(agentId, pending);

    try {
      return await pending;
    } finally {
      this.mutations.delete(agentId);
    }
  }
  public async shutdown(): Promise<void> {
    this.stopping = true;

    const closing = Promise.allSettled(
      [...this.operations.values()].map((operation) => operation.shutdown()),
    );

    await Promise.allSettled(this.mutations.values());

    const failed = (await closing).flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    );

    if (failed.length > 0)
      throw new AggregateError(failed, 'Agent login cleanup failed');
  }
  private notifyFinished(agentId: string): void {
    if (this.stopping || this.isBusy(agentId)) return;

    for (const listener of this.finished) listener(agentId);
  }
  private current(agentId: string): LoginOperation | undefined {
    const operationId = this.latest.get(agentId);

    return operationId ? this.operations.get(operationId) : undefined;
  }
  private requireOperation(operationId: string): LoginOperation {
    const operation = this.operations.get(operationId);

    if (!operation) throw new Error('Agent login operation was not found');

    return operation;
  }
  private requireOwner(input: AgentLoginOperation): LoginOperation {
    const operation = this.requireOperation(input.operationId);

    if (!operation.isOwnedBy(input.ownerToken))
      throw new Error('Agent login belongs to another App');

    return operation;
  }
  private requireNoMutation(agentId: string): void {
    if (this.mutations.has(agentId)) throw new Error('Agent is in use');
  }
}

export const createAgentLogins = (deps: AgentLoginsDeps): AgentLogins =>
  new AgentLogins(deps);
