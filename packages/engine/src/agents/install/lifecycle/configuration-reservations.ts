import { ResourceCleanupError } from '../../../lib/resource-cleanup-error';

export class ConfigurationReservations {
  private readonly active = new Map<string, Promise<unknown>>();
  public has(agentId: string): boolean {
    return this.active.has(agentId);
  }
  public run<Result>(
    agentId: string,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    const result = Promise.withResolvers<Result>();
    this.active.set(agentId, result.promise);
    void Promise.resolve().then(operation).then(result.resolve, result.reject);
    return result.promise
      .catch((error: unknown) => {
        this.retainCleanup(agentId, error);
        throw error;
      })
      .finally(() => this.release(agentId, result.promise));
  }
  private release(agentId: string, promise: Promise<unknown>): void {
    if (this.active.get(agentId) === promise) this.active.delete(agentId);
  }
  private retainCleanup(agentId: string, error: unknown): void {
    if (!(error instanceof ResourceCleanupError)) return;
    const cleanup = error.awaitCleanup();
    this.active.set(agentId, cleanup);
    void cleanup.then(
      () => this.active.delete(agentId),
      () => {},
    );
  }
  public async wait(): Promise<void> {
    await Promise.allSettled(this.active.values());
  }
}
