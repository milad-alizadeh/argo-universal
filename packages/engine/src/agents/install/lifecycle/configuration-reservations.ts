import type { AgentCheck } from '@repo/contracts';
import { ResourceCleanupError } from '../../../lib/resource-cleanup-error';

export class ConfigurationReservations {
  private readonly active = new Map<string, Promise<unknown>>();
  private readonly checks = new Map<string, Promise<AgentCheck>>();
  private readonly cancels = new Map<string, AbortController>();
  public has(agentId: string): boolean {
    return this.active.has(agentId) || this.checks.has(agentId);
  }
  public pendingCheck(agentId: string): Promise<AgentCheck> | undefined {
    return this.checks.get(agentId);
  }
  public afterCheck<Result>(
    agentId: string,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    const checking = this.pendingCheck(agentId);

    return checking ? checking.then(operation) : operation();
  }
  public hasExclusive(agentId: string): boolean {
    return this.active.has(agentId);
  }
  public check(
    agentId: string,
    operation: (signal: AbortSignal) => Promise<AgentCheck>,
  ): Promise<AgentCheck> {
    const existing = this.checks.get(agentId);

    if (existing) return existing;

    const controller = new AbortController();

    const pending = this.inspect(agentId, () =>
      operation(controller.signal),
    ).finally(() => this.forgetCheck(agentId));

    this.checks.set(agentId, pending);
    this.cancels.set(agentId, controller);

    return pending;
  }
  private forgetCheck(agentId: string): void {
    this.checks.delete(agentId);
    this.cancels.delete(agentId);
  }
  // Stops a running Readiness check; it settles once its program has stopped.
  public async cancelCheck(agentId: string): Promise<boolean> {
    const pending = this.checks.get(agentId);

    if (!pending) return false;

    this.cancels.get(agentId)?.abort();
    await Promise.allSettled([pending]);

    return true;
  }
  private async inspect(
    agentId: string,
    operation: () => Promise<AgentCheck>,
  ): Promise<AgentCheck> {
    while (this.active.has(agentId))
      await Promise.allSettled([this.active.get(agentId)]);

    try {
      return await operation();
    } catch (error) {
      this.retainCleanup(agentId, error);
      throw error;
    }
  }
  public run<Result>(
    agentId: string,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    const result = Promise.withResolvers<Result>();
    this.active.set(agentId, result.promise);
    void Promise.resolve().then(operation).then(result.resolve, result.reject);

    return result.promise
      .catch((cause: unknown) => {
        this.retainCleanup(agentId, cause);
        throw cause;
      })
      .finally(() => this.release(agentId, result.promise));
  }
  private release(agentId: string, promise: Promise<unknown>): void {
    if (this.active.get(agentId) === promise) this.active.delete(agentId);
  }
  private retainCleanup(agentId: string, cause: unknown): void {
    if (!(cause instanceof ResourceCleanupError)) return;
    const cleanup = cause.awaitCleanup();
    this.active.set(agentId, cleanup);
    void cleanup.then(
      () => this.active.delete(agentId),
      () => {},
    );
  }
  public async wait(): Promise<void> {
    while (this.active.size > 0 || this.checks.size > 0)
      await Promise.allSettled([
        ...this.active.values(),
        ...this.checks.values(),
      ]);
  }
}
