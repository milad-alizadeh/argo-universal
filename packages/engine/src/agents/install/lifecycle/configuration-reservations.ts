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
    return result.promise.finally(() => this.active.delete(agentId));
  }
  public async wait(): Promise<void> {
    await Promise.allSettled(this.active.values());
  }
}
