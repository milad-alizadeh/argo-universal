export class ResourceCleanupError extends Error {
  public constructor(
    private readonly cleanup: Promise<void>,
    cause: unknown,
  ) {
    super('Resource cleanup failed: process exit was not observed', { cause });
  }
  public awaitCleanup(): Promise<void> {
    return this.cleanup;
  }
}
